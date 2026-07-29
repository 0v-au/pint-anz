import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { XMLParser } from "fast-xml-parser";
import {
  defaultCacheDirectory,
  RULESET_PROVENANCE,
  verifyRuleset,
} from "./rulesets.js";
import { RULESET_DIGEST, RULESET_VERSION } from "./types.js";

const COPYRIGHT_NOTICE =
  "Copyrighted OpenPeppol content read from your checksum-verified local installation. " +
  "Shown for local inspection only; consult the authoritative source and its terms. " +
  "This package does not redistribute the official rule text.";

const SCHEMATRON_SOURCES = [
  "resources/trn-invoice/schematron/PINT-UBL-validation-preprocessed.sch",
  "resources/trn-invoice/schematron/PINT-jurisdiction-aligned-rules.sch",
] as const;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => ["pattern", "rule", "assert", "report"].includes(name),
  removeNSPrefix: true,
});

/** Provenance for official rule text read from a local installed ruleset. */
export interface OfficialRuleSource {
  /** Official archive URL whose bytes are pinned by `rulesetDigest`. @example "https://docs.peppol.eu/poac/aunz/pint-aunz/resources.zip" */
  readonly resourcesUrl: string;
  /** Path inside the installed official archive. @example "resources/trn-invoice/schematron/PINT-UBL-validation-preprocessed.sch" */
  readonly path: string;
  /** SHA-256 of the exact Schematron file read. @example "9248a6e29dafb857993e6915b5fa47bae38091c74fdfe1014faa1744700936ac" */
  readonly sha256: string;
}

/** Transient view of one Official Rule from a verified local installation. */
export interface InspectedOfficialRule {
  /** Official rule identifier. @example "ibr-004" */
  readonly id: string;
  /** Official Schematron flag. @example "fatal" */
  readonly severity: string;
  /** Official diagnostic message, read only from the local artefact. @example "[example]-Synthetic message." */
  readonly message: string;
  /** Official XPath rule context, read only from the local artefact. @example "cac:Example" */
  readonly context: string;
  /** Official XPath assertion or report test, read only from the local artefact. @example "cbc:ID" */
  readonly test: string;
  /** Pinned PINT A-NZ ruleset version. @example "1.1.2" */
  readonly rulesetVersion: typeof RULESET_VERSION;
  /** SHA-256 of the pinned official resources archive. @example "5750a93fe98c4e1bad1d1030f749a473d4b2c3afc5bdeb5372889804b4273d1a" */
  readonly rulesetDigest: typeof RULESET_DIGEST;
  /** Exact local-file provenance for the displayed content. @example {"resourcesUrl":"https://docs.peppol.eu/poac/aunz/pint-aunz/resources.zip","path":"resources/trn-invoice/schematron/PINT-UBL-validation-preprocessed.sch","sha256":"9248a6e29dafb857993e6915b5fa47bae38091c74fdfe1014faa1744700936ac"} */
  readonly source: OfficialRuleSource;
  /** Project-authored rights notice attached to every human and JSON view. @example "Copyrighted OpenPeppol content read from your checksum-verified local installation. Shown for local inspection only; consult the authoritative source and its terms. This package does not redistribute the official rule text." */
  readonly copyrightNotice: string;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Official Schematron contains an assertion without ${field}.`);
  }
  return value.trim();
}

/**
 * Parse official rules from Schematron bytes already verified by the caller.
 *
 * Tests use synthetic bytes; production passes only locally read, pinned bytes.
 */
export function parseSchematronRules(
  bytes: Uint8Array,
  source: OfficialRuleSource,
): readonly InspectedOfficialRule[] {
  const document = parser.parse(Buffer.from(bytes).toString("utf8")) as {
    schema?: {
      pattern?: Array<{
        rule?: Array<Record<string, unknown>>;
      }>;
    };
  };
  const result: InspectedOfficialRule[] = [];
  for (const pattern of document.schema?.pattern ?? []) {
    for (const rule of pattern.rule ?? []) {
      const context = requiredString(rule["@_context"], "an XPath context");
      for (const kind of ["assert", "report"] as const) {
        const assertions = (rule[kind] ?? []) as Array<Record<string, unknown>>;
        for (const assertion of assertions) {
          result.push({
            id: requiredString(assertion["@_id"], "a rule ID"),
            severity: requiredString(assertion["@_flag"] ?? "fatal", "a severity"),
            message: requiredString(assertion["#text"], "a diagnostic message")
              .replace(/\s+/g, " ")
              .trim(),
            context,
            test: requiredString(assertion["@_test"], "an XPath test"),
            rulesetVersion: RULESET_VERSION,
            rulesetDigest: RULESET_DIGEST,
            source,
            copyrightNotice: COPYRIGHT_NOTICE,
          });
        }
      }
    }
  }
  return result;
}

async function readVerifiedSource(
  rulesetDirectory: string,
  relativePath: (typeof SCHEMATRON_SOURCES)[number],
): Promise<readonly InspectedOfficialRule[]> {
  const expected = RULESET_PROVENANCE.files[relativePath];
  const bytes = await readFile(join(rulesetDirectory, relativePath));
  const actual = sha256(bytes);
  if (actual !== expected) {
    throw new Error(`${relativePath} failed checksum verification.`);
  }
  return parseSchematronRules(bytes, {
    resourcesUrl: RULESET_PROVENANCE.resources.url,
    path: relativePath,
    sha256: actual,
  });
}

/**
 * Inspect one Official Rule from an installed, checksum-verified ruleset.
 *
 * Returns `undefined` for an Unknown Rule. Official content is neither written
 * nor cached by this operation.
 */
export async function inspectInstalledRule(
  ruleId: string,
  options: {
    /** Prepared installed ruleset directory. @example "/controlled/pint-anz/1.1.2" */
    readonly rulesetDirectory?: string;
    /** Cache root containing the version directory. @example "/home/user/.cache/pint-anz/rulesets" */
    readonly cacheDirectory?: string;
  } = {},
): Promise<InspectedOfficialRule | undefined> {
  const explicit = options.rulesetDirectory !== undefined;
  const directory = explicit
    ? resolve(options.rulesetDirectory)
    : resolve(options.cacheDirectory ?? defaultCacheDirectory(), RULESET_VERSION);
  await verifyRuleset(directory, { allowLegacyDirectory: explicit });
  for (const relativePath of SCHEMATRON_SOURCES) {
    const match = (await readVerifiedSource(directory, relativePath)).find(
      (rule) => rule.id === ruleId,
    );
    if (match) return match;
  }
  return undefined;
}
