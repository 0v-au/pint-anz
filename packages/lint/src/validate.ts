import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { promisify } from "node:util";
import { XMLParser } from "fast-xml-parser";
import {
  RULESET_VERSION,
  type Diagnostic,
  type DiagnosticSeverity,
  type DocumentType,
  type ValidateFileOptions,
  type ValidationResult,
} from "./types.js";

const require = createRequire(import.meta.url);
const SaxonJS = require("saxon-js") as {
  transform(
    options: { stylesheetInternal: unknown; sourceFileName: string; destination: "serialized" },
    mode: "async",
  ): Promise<{ principalResult: string }>;
};
const execFileAsync = promisify(execFile);

const DEFAULT_MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ROOTS = {
  Invoice: {
    namespace: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    type: "invoice",
    schema: "UBL-Invoice-2.1.xsd",
  },
  CreditNote: {
    namespace: "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2",
    type: "credit-note",
    schema: "UBL-CreditNote-2.1.xsd",
  },
} as const;

const svrlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => name === "svrl:failed-assert" || name === "svrl:successful-report",
});

function diagnostic(
  document: string,
  stage: Diagnostic["stage"],
  message: string,
  overrides: Partial<Pick<Diagnostic, "severity" | "ruleId" | "location">> = {},
): Diagnostic {
  return {
    severity: overrides.severity ?? "error",
    ruleId: overrides.ruleId ?? null,
    message,
    location: overrides.location ?? null,
    document,
    rulesetVersion: RULESET_VERSION,
    stage,
  };
}

function result(
  document: string,
  documentType: DocumentType,
  complete: boolean,
  diagnostics: Diagnostic[],
): ValidationResult {
  return {
    document,
    documentType,
    rulesetVersion: RULESET_VERSION,
    complete,
    valid: complete && diagnostics.every((item) => item.severity !== "error"),
    diagnostics,
  };
}

function detectRoot(bytes: Buffer): { localName: string; namespace: string } | null {
  const match = /<(?!\?|!)(?:([A-Za-z_][\w.-]*):)?([A-Za-z_][\w.-]*)([^>]*)/.exec(
    bytes.toString("utf8"),
  );
  if (!match) return null;
  const [, prefix, localName, attributes] = match;
  const namespaceAttribute = prefix ? `xmlns:${prefix}` : "xmlns";
  const escaped = namespaceAttribute.replace(":", "\\:");
  const namespaceMatch = new RegExp(`${escaped}\\s*=\\s*["']([^"']*)["']`).exec(attributes);
  return { localName, namespace: namespaceMatch?.[1] ?? "" };
}

function severity(flag: unknown): DiagnosticSeverity {
  return /^(warning|warn)$/i.test(String(flag ?? "")) ? "warning" : "error";
}

async function runSchematron(
  stylesheetPath: string,
  sourcePath: string,
  document: string,
): Promise<Diagnostic[]> {
  const stylesheet = JSON.parse(await readFile(stylesheetPath, "utf8")) as unknown;
  const transformed = await SaxonJS.transform(
    { stylesheetInternal: stylesheet, sourceFileName: sourcePath, destination: "serialized" },
    "async",
  );
  const parsed = svrlParser.parse(transformed.principalResult) as {
    "svrl:schematron-output"?: Record<string, Array<Record<string, unknown>>>;
  };
  const output = parsed["svrl:schematron-output"] ?? {};
  const diagnostics: Diagnostic[] = [];

  for (const kind of ["svrl:failed-assert", "svrl:successful-report"]) {
    for (const entry of output[kind] ?? []) {
      diagnostics.push(
        diagnostic(document, "business-rule", String(entry["svrl:text"] ?? "").trim(), {
          severity: severity(entry["@_flag"]),
          ruleId: typeof entry["@_id"] === "string" ? entry["@_id"] : null,
          location: typeof entry["@_location"] === "string" ? entry["@_location"] : null,
        }),
      );
    }
  }
  return diagnostics;
}

/** Validate one UBL file through preflight, UBL 2.1 XSD, and both PINT A-NZ Schematrons. */
export async function validateFile(
  documentPath: string,
  options: ValidateFileOptions,
): Promise<ValidationResult> {
  let bytes: Buffer;
  try {
    bytes = await readFile(documentPath);
  } catch (error) {
    return result(documentPath, "unknown", false, [
      diagnostic(documentPath, "input", `Cannot read document: ${(error as Error).message}`),
    ]);
  }

  const maximum = options.maxDocumentBytes ?? DEFAULT_MAX_DOCUMENT_BYTES;
  if (bytes.length === 0) {
    return result(documentPath, "unknown", false, [
      diagnostic(documentPath, "preflight", "Document contains no bytes."),
    ]);
  }
  if (bytes.length > maximum) {
    return result(documentPath, "unknown", false, [
      diagnostic(
        documentPath,
        "preflight",
        `Document is ${bytes.length} bytes; the configured limit is ${maximum} bytes.`,
      ),
    ]);
  }
  if (/<!DOCTYPE/i.test(bytes.toString("latin1"))) {
    return result(documentPath, "unknown", false, [
      diagnostic(documentPath, "preflight", "DOCTYPE declarations are forbidden."),
    ]);
  }

  const root = detectRoot(bytes);
  const rootDefinition = root ? ROOTS[root.localName as keyof typeof ROOTS] : undefined;
  if (!root || !rootDefinition || root.namespace !== rootDefinition.namespace) {
    return result(documentPath, "unknown", false, [
      diagnostic(documentPath, "preflight", "Expected a UBL 2.1 Invoice or CreditNote root element."),
    ]);
  }

  const schemaPath = join(
    options.rulesetDirectory,
    "ubl-2.1",
    "xsd",
    "maindoc",
    rootDefinition.schema,
  );
  const sefDirectory = join(options.rulesetDirectory, "sef");
  const requiredArtefacts = [
    schemaPath,
    join(sefDirectory, "pint.sef.json"),
    join(sefDirectory, "aligned.sef.json"),
  ];
  try {
    await Promise.all(requiredArtefacts.map((path) => access(path)));
  } catch {
    return result(documentPath, rootDefinition.type, false, [
      diagnostic(
        documentPath,
        "tool",
        `The prepared PINT A-NZ ${RULESET_VERSION} ruleset is incomplete at ${options.rulesetDirectory}.`,
      ),
    ]);
  }

  try {
    await execFileAsync("xmllint", ["--noout", "--nonet", "--schema", schemaPath, documentPath]);
  } catch (error) {
    const failure = error as Error & { code?: string | number; stderr?: string };
    if (failure.code === "ENOENT") {
      return result(documentPath, rootDefinition.type, false, [
        diagnostic(documentPath, "tool", "xmllint is required but was not found on PATH."),
      ]);
    }
    const stderr = String(failure.stderr ?? failure.message);
    const messages = stderr
      .trim()
      .split("\n")
      .filter(Boolean)
      .filter((line) => !line.endsWith(" fails to validate"));
    if (failure.code !== 3 && failure.code !== 4) {
      return result(documentPath, rootDefinition.type, false, [
        diagnostic(
          documentPath,
          "tool",
          `UBL schema validation could not run: ${messages.join(" ") || failure.message}`,
        ),
      ]);
    }
    return result(
      documentPath,
      rootDefinition.type,
      true,
      messages.map((message) => diagnostic(documentPath, "schema", message)),
    );
  }

  try {
    const diagnostics = [
      ...(await runSchematron(join(sefDirectory, "pint.sef.json"), documentPath, documentPath)),
      ...(await runSchematron(join(sefDirectory, "aligned.sef.json"), documentPath, documentPath)),
    ];
    return result(documentPath, rootDefinition.type, true, diagnostics);
  } catch (error) {
    return result(documentPath, rootDefinition.type, false, [
      diagnostic(documentPath, "tool", `Cannot run the prepared ruleset: ${(error as Error).message}`),
    ]);
  }
}
