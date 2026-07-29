import { access, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { XMLParser } from "fast-xml-parser";
import { memoryPages, validateXML, type XMLFileInfo } from "xmllint-wasm";
import {
  RULESET_VERSION,
  RULESET_DIGEST,
  type Diagnostic,
  type DiagnosticSeverity,
  type DocumentContent,
  type DocumentType,
  type ValidateDocumentOptions,
  type ValidateFileOptions,
  type ValidationResult,
} from "./types.js";
import { resolveRulesetDirectory } from "./rulesets.js";
import { ruleRemediationUrl } from "./remediation.js";

const require = createRequire(import.meta.url);
const SaxonJS = require("saxon-js") as {
  transform(
    options: { stylesheetInternal: unknown; sourceFileName: string; destination: "serialized" },
    mode: "async",
  ): Promise<{ principalResult: string }>;
};
/** Receiver policy used by the public fixture contract; callers may raise it explicitly. */
const DEFAULT_MAX_DOCUMENT_BYTES = 100 * 1024;
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
const stylesheetCache = new Map<string, Promise<unknown>>();
const schemaCache = new Map<string, Promise<ReadonlyMap<string, XMLFileInfo>>>();

function loadStylesheet(path: string): Promise<unknown> {
  let loaded = stylesheetCache.get(path);
  if (!loaded) {
    // Drop a rejected load from the cache so one transient FS error does not
    // permanently fail every later validation in a long-running process.
    loaded = readFile(path, "utf8")
      .then((source) => JSON.parse(source) as unknown)
      .catch((error: unknown) => {
        stylesheetCache.delete(path);
        throw error;
      });
    stylesheetCache.set(path, loaded);
  }
  return loaded;
}

async function schemaFiles(rulesetDirectory: string): Promise<ReadonlyMap<string, XMLFileInfo>> {
  let loaded = schemaCache.get(rulesetDirectory);
  if (!loaded) {
    loaded = (async () => {
      const root = join(rulesetDirectory, "ubl-2.1");
      const files = new Map<string, XMLFileInfo>();
      async function visit(directory: string, relativeDirectory: string): Promise<void> {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          const relativePath = join(relativeDirectory, entry.name).split("\\").join("/");
          const path = join(directory, entry.name);
          if (entry.isDirectory()) await visit(path, relativePath);
          else if (entry.isFile() && entry.name.endsWith(".xsd")) {
            // xmllint-wasm preloads a flat in-memory filesystem. UBL schema
            // basenames are unique, so imports can safely resolve there.
            const contents = (await readFile(path, "utf8")).replace(
              /(schemaLocation\s*=\s*["'])[^"']*\/([^/"']+)(["'])/g,
              "$1$2$3",
            );
            files.set(relativePath, { fileName: basename(relativePath), contents });
          }
        }
      }
      await visit(join(root, "xsd"), "xsd");
      return files;
    })().catch((error: unknown) => {
      schemaCache.delete(rulesetDirectory);
      throw error;
    });
    schemaCache.set(rulesetDirectory, loaded);
  }
  return loaded;
}

async function xsdValidate(
  bytes: Buffer,
  schemaRelativePath: string,
  rulesetDirectory: string,
): Promise<Awaited<ReturnType<typeof validateXML>>> {
  const files = await schemaFiles(rulesetDirectory);
  const schema = files.get(schemaRelativePath);
  if (!schema) throw new Error(`Missing UBL schema ${schemaRelativePath}.`);
  return validateXML({
    xml: { fileName: "document.xml", contents: bytes },
    schema,
    preload: [...files.values()].filter((file) => file.fileName !== schema.fileName),
    initialMemoryPages: 512,
    maxMemoryPages: 2 * memoryPages.GiB,
  });
}

function diagnostic(
  document: string,
  stage: Diagnostic["stage"],
  message: string,
  overrides: Partial<Pick<Diagnostic, "severity" | "ruleId" | "location">> = {},
): Diagnostic {
  const ruleId = overrides.ruleId ?? null;
  return {
    severity: overrides.severity ?? "error",
    ruleId,
    message,
    location: overrides.location ?? null,
    document,
    rulesetVersion: RULESET_VERSION,
    rulesetDigest: RULESET_DIGEST,
    stage,
    ...(stage === "business-rule" && ruleId
      ? { remediationUrl: ruleRemediationUrl(ruleId) }
      : {}),
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
    rulesetDigest: RULESET_DIGEST,
    complete,
    valid: complete && diagnostics.every((item) => item.severity !== "error"),
    diagnostics,
  };
}

function detectRoot(bytes: Buffer): { localName: string; namespace: string } | null {
  const text = bytes.toString("utf8");
  let offset = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  while (offset < text.length) {
    if (/\s/.test(text[offset])) offset += 1;
    else if (text.startsWith("<?", offset)) {
      const end = text.indexOf("?>", offset);
      if (end < 0) return null;
      offset = end + 2;
    } else if (text.startsWith("<!--", offset)) {
      const end = text.indexOf("-->", offset);
      if (end < 0) return null;
      offset = end + 3;
    } else if (text[offset] === "<" && !text.startsWith("<!", offset)) {
      const match = /^<(?:([A-Za-z_][\w.-]*):)?([A-Za-z_][\w.-]*)([^>]*)/.exec(text.slice(offset));
      if (!match) return null;
      const [, prefix, localName, attributes] = match;
      const namespaceAttribute = prefix ? `xmlns:${prefix}` : "xmlns";
      const escaped = namespaceAttribute.replace(":", "\\:");
      const namespaceMatch = new RegExp(`${escaped}\\s*=\\s*["']([^"']*)["']`).exec(attributes);
      return { localName, namespace: namespaceMatch?.[1] ?? "" };
    } else return null;
  }
  return null;
}

function severity(flag: unknown): DiagnosticSeverity {
  return /^(warning|warn)$/i.test(String(flag ?? "")) ? "warning" : "error";
}

async function runSchematron(
  stylesheetPath: string,
  sourcePath: string,
  document: string,
): Promise<Diagnostic[]> {
  const stylesheet = await loadStylesheet(stylesheetPath);
  const transformed = await SaxonJS.transform(
    { stylesheetInternal: stylesheet, sourceFileName: sourcePath, destination: "serialized" },
    "async",
  );
  const parsed = svrlParser.parse(transformed.principalResult) as {
    "svrl:schematron-output"?: Record<string, Array<Record<string, unknown>>>;
  };
  // A transform that did not emit an SVRL report is not a clean run with zero
  // failures — treat a missing root as a tool failure so validateBytes reports
  // complete:false rather than silently passing the document.
  const output = parsed["svrl:schematron-output"];
  if (!output) throw new Error("Schematron transform produced no SVRL output.");
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

async function validateBytes(
  bytes: Buffer,
  sourcePath: string,
  document: string,
  options: ValidateFileOptions,
): Promise<ValidationResult> {
  const maximum = options.maxDocumentBytes ?? DEFAULT_MAX_DOCUMENT_BYTES;
  if (bytes.length === 0) {
    return result(document, "unknown", false, [
      diagnostic(document, "preflight", "Document contains no bytes."),
    ]);
  }
  if (bytes.length > maximum) {
    return result(document, "unknown", false, [
      diagnostic(
        document,
        "preflight",
        `Document is ${bytes.length} bytes; the configured limit is ${maximum} bytes.`,
      ),
    ]);
  }
  if (/<!DOCTYPE/i.test(bytes.toString("latin1"))) {
    return result(document, "unknown", false, [
      diagnostic(document, "preflight", "DOCTYPE declarations are forbidden."),
    ]);
  }
  const encoding = /^<\?xml[^>]*encoding\s*=\s*["']([^"']+)["']/i.exec(bytes.toString("latin1"));
  if (encoding && !/^utf-8$/i.test(encoding[1])) {
    return result(document, "unknown", false, [
      diagnostic(document, "preflight", `Declared encoding ${encoding[1]} is not UTF-8.`),
    ]);
  }

  const root = detectRoot(bytes);
  const rootDefinition = root ? ROOTS[root.localName as keyof typeof ROOTS] : undefined;
  if (!root || !rootDefinition || root.namespace !== rootDefinition.namespace) {
    return result(document, "unknown", false, [
      diagnostic(document, "preflight", "Expected a UBL 2.1 Invoice or CreditNote root element."),
    ]);
  }

  let rulesetDirectory: string;
  try {
    rulesetDirectory = await resolveRulesetDirectory(options.rulesetDirectory);
  } catch (error) {
    return result(document, rootDefinition.type, false, [
      diagnostic(
        document,
        "tool",
        `PINT A-NZ ${RULESET_VERSION} is not installed or failed verification: ${(error as Error).message}`,
      ),
    ]);
  }

  const schemaPath = join(
    rulesetDirectory,
    "ubl-2.1",
    "xsd",
    "maindoc",
    rootDefinition.schema,
  );
  const sefDirectory = join(rulesetDirectory, "sef");
  const requiredArtefacts = [
    schemaPath,
    join(sefDirectory, "pint.sef.json"),
    join(sefDirectory, "aligned.sef.json"),
  ];
  try {
    await Promise.all(requiredArtefacts.map((path) => access(path)));
  } catch {
    return result(document, rootDefinition.type, false, [
      diagnostic(
        document,
        "tool",
        `The prepared PINT A-NZ ${RULESET_VERSION} ruleset is incomplete at ${rulesetDirectory}.`,
      ),
    ]);
  }

  try {
    const schemaValidation = await xsdValidate(
      bytes,
      `xsd/maindoc/${rootDefinition.schema}`,
      rulesetDirectory,
    );
    if (!schemaValidation.valid) {
      return result(
        document,
        rootDefinition.type,
        true,
        schemaValidation.errors.map((error) =>
          diagnostic(document, "schema", error.message, {
            location: error.loc ? `line ${error.loc.lineNumber}` : null,
          }),
        ),
      );
    }
  } catch (error) {
    return result(document, rootDefinition.type, false, [
      diagnostic(document, "tool", `UBL schema validation could not run: ${(error as Error).message}`),
    ]);
  }

  try {
    const diagnostics = [
      ...(await runSchematron(join(sefDirectory, "pint.sef.json"), sourcePath, document)),
      ...(await runSchematron(join(sefDirectory, "aligned.sef.json"), sourcePath, document)),
    ];
    return result(document, rootDefinition.type, true, diagnostics);
  } catch (error) {
    return result(document, rootDefinition.type, false, [
      diagnostic(document, "tool", `Cannot run the prepared ruleset: ${(error as Error).message}`),
    ]);
  }
}

/** Validate one UBL file through preflight, UBL 2.1 XSD, and both PINT A-NZ Schematrons. */
export async function validateFile(
  documentPath: string,
  options: ValidateFileOptions = {},
): Promise<ValidationResult> {
  let bytes: Buffer;
  try {
    bytes = await readFile(documentPath);
  } catch (error) {
    return result(documentPath, "unknown", false, [
      diagnostic(documentPath, "input", `Cannot read document: ${(error as Error).message}`),
    ]);
  }
  return validateBytes(bytes, documentPath, documentPath, options);
}

/** Validate XML supplied by an application without printing or mutating process state. */
export async function validateDocument(
  content: DocumentContent,
  options: ValidateDocumentOptions = {},
): Promise<ValidationResult> {
  const bytes = typeof content === "string" ? Buffer.from(content, "utf8") : Buffer.from(content);
  const document = options.documentName ?? "<memory>";
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "pint-anz-lint-"));
  const sourcePath = join(temporaryDirectory, "document.xml");
  try {
    await writeFile(sourcePath, bytes, { mode: 0o600 });
    return await validateBytes(bytes, sourcePath, document, options);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
