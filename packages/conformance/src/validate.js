/**
 * Validation runner for the fixtures corpus.
 *
 * Pipeline per document, mirroring what a compliant receiver does:
 *   1. preflight  — byte-level policy checks (DOCTYPE ban, size, root dispatch)
 *   2. XSD        — UBL 2.1 maindoc schema via xmllint (--nonet: no network,
 *                   external entities never fetched)
 *   3. Schematron — both official transforms (shared PINT + A-NZ aligned)
 *
 * A stage only runs when every earlier stage passed.
 */
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { XMLParser } from "fast-xml-parser";
import { paths } from "./artefacts.js";

const require = createRequire(import.meta.url);
const SaxonJS = require("saxon-js");
const execFileAsync = promisify(execFile);

/** Demonstration payload cap used by the oversized fixture; not an official PINT limit. */
export const MAX_DOCUMENT_BYTES = 100 * 1024;

const ROOT_NAMESPACES = {
  Invoice: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
  CreditNote: "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2",
};

let sefCache = null;
function loadSefs() {
  sefCache ??= {
    pint: JSON.parse(readFileSync(paths.pintSef, "utf8")),
    aligned: JSON.parse(readFileSync(paths.alignedSef, "utf8")),
  };
  return sefCache;
}

const svrlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => name === "svrl:failed-assert" || name === "svrl:successful-report",
});

/**
 * Detect the document root: { localName, namespace } or null when unparseable.
 * Tokenizes the prolog (XML declaration, processing instructions, comments,
 * whitespace) instead of regex-scanning raw text, so markup inside comments
 * can never be mistaken for the root element.
 */
export function detectRoot(bytes) {
  const text = bytes.toString("utf8");
  let i = 0;
  while (i < text.length) {
    if (/\s/.test(text[i])) {
      i += 1;
    } else if (text.startsWith("<?", i)) {
      const end = text.indexOf("?>", i);
      if (end === -1) return null;
      i = end + 2;
    } else if (text.startsWith("<!--", i)) {
      const end = text.indexOf("-->", i);
      if (end === -1) return null;
      i = end + 3;
    } else if (text.startsWith("<!", i)) {
      // DOCTYPE or other markup declaration: never a root, and DOCTYPEs are
      // rejected separately by preflight().
      return null;
    } else if (text[i] === "<") {
      const match = /^<(?:([A-Za-z_][\w.-]*):)?([A-Za-z_][\w.-]*)([^>]*)/.exec(text.slice(i));
      if (!match) return null;
      const [, prefix, localName, attrs] = match;
      const nsAttr = prefix ? `xmlns:${prefix}` : "xmlns";
      const nsMatch = new RegExp(`${nsAttr}\\s*=\\s*"([^"]*)"`).exec(attrs) ??
        new RegExp(`${nsAttr}\\s*=\\s*'([^']*)'`).exec(attrs);
      return { localName, namespace: nsMatch?.[1] ?? "" };
    } else {
      // Bare text before any element: not a well-formed document root.
      return null;
    }
  }
  return null;
}

/**
 * Policy checks a receiver applies before any parser or schema work.
 * Returns a list of rejection reasons (empty = accepted).
 */
export function preflight(bytes) {
  const reasons = [];
  if (bytes.length === 0) {
    return ["empty: document contains no bytes"];
  }
  if (bytes.length > MAX_DOCUMENT_BYTES) {
    reasons.push(`oversized: ${bytes.length} bytes exceeds the ${MAX_DOCUMENT_BYTES}-byte harness cap`);
  }
  // Scan the ENTIRE document for DOCTYPE, not a fixed-size head: a legal
  // prolog can hold arbitrary whitespace/comments before the DTD, and xmllint
  // --nonet blocks network fetches but not local file:// entity resolution.
  const text = bytes.toString("latin1");
  if (/<!DOCTYPE/i.test(text)) {
    reasons.push("doctype: DOCTYPE declarations are forbidden (XXE hardening; Peppol envelope specification bans DTDs)");
  }
  // The XML declaration is only legal at byte offset 0.
  const encodingMatch = /^<\?xml[^>]*encoding\s*=\s*["']([^"']+)["']/i.exec(text);
  if (encodingMatch && !/^utf-8$/i.test(encodingMatch[1])) {
    reasons.push(`encoding: declared encoding ${encodingMatch[1]} is not UTF-8`);
  }
  const root = detectRoot(bytes);
  if (!root) {
    reasons.push("no-root: no XML element found");
  } else if (!(root.localName in ROOT_NAMESPACES)) {
    reasons.push(`unsupported-document: root element ${root.localName} is not Invoice or CreditNote`);
  } else if (root.namespace !== ROOT_NAMESPACES[root.localName]) {
    reasons.push(`wrong-namespace: root namespace "${root.namespace}" is not ${ROOT_NAMESPACES[root.localName]}`);
  }
  return reasons;
}

/** xmllint well-formedness + UBL 2.1 XSD validation. */
export async function xsdValidate(filePath, rootLocalName) {
  const schema = rootLocalName === "CreditNote" ? paths.creditNoteXsd : paths.invoiceXsd;
  try {
    await execFileAsync("xmllint", ["--noout", "--nonet", "--schema", schema, filePath]);
    return { valid: true, errors: [] };
  } catch (error) {
    const stderr = String(error.stderr ?? error.message);
    return {
      valid: false,
      errors: stderr.trim().split("\n").filter((line) => !line.endsWith(" fails to validate")),
      wellFormed: !/parser error/.test(stderr),
    };
  }
}

/** Runs one compiled Schematron and returns every fired assert/report. */
async function runSchematron(sef, ruleset, filePath) {
  const result = await SaxonJS.transform(
    {
      stylesheetInternal: sef,
      sourceFileName: filePath,
      destination: "serialized",
    },
    "async",
  );
  const svrl = svrlParser.parse(result.principalResult);
  const output = svrl["svrl:schematron-output"] ?? {};
  const fired = [];
  for (const kind of ["svrl:failed-assert", "svrl:successful-report"]) {
    for (const entry of output[kind] ?? []) {
      fired.push({
        ruleset,
        id: entry["@_id"] ?? "(no id)",
        flag: entry["@_flag"] ?? "fatal",
        location: entry["@_location"] ?? "",
        text: String(entry["svrl:text"] ?? "").trim(),
      });
    }
  }
  return fired;
}

/**
 * Full pipeline. Returns:
 * {
 *   stage: "rejected" | "malformed" | "schema-invalid" | "rules",
 *   rejectionReasons, xsdErrors,
 *   fired: [{ ruleset, id, flag, location, text }],
 *   firedIds: distinct rule ids (fatal or not) that fired
 * }
 */
export async function validateDocument(filePath) {
  const bytes = readFileSync(filePath);
  const rejectionReasons = preflight(bytes);
  if (rejectionReasons.length > 0) {
    return { stage: "rejected", rejectionReasons, xsdErrors: [], fired: [], firedIds: [] };
  }

  const root = detectRoot(bytes);
  const xsd = await xsdValidate(filePath, root.localName);
  if (!xsd.valid) {
    return {
      stage: xsd.wellFormed === false ? "malformed" : "schema-invalid",
      rejectionReasons: [],
      xsdErrors: xsd.errors,
      fired: [],
      firedIds: [],
    };
  }

  const sefs = loadSefs();
  const fired = [
    ...(await runSchematron(sefs.pint, "pint", filePath)),
    ...(await runSchematron(sefs.aligned, "aligned", filePath)),
  ];
  return {
    stage: "rules",
    rejectionReasons: [],
    xsdErrors: [],
    fired,
    firedIds: [...new Set(fired.map((f) => f.id))].sort(),
  };
}
