export const RULESET_VERSION = "1.1.2" as const;
export const RULESET_NAME = "PINT A-NZ Billing" as const;
export const RULESET_DIGEST =
  "5750a93fe98c4e1bad1d1030f749a473d4b2c3afc5bdeb5372889804b4273d1a" as const;

export type ValidationStage = "input" | "preflight" | "schema" | "business-rule" | "tool";
export type DiagnosticSeverity = "error" | "warning";
export type DocumentType = "invoice" | "credit-note" | "unknown";

export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly ruleId: string | null;
  readonly message: string;
  readonly location: string | null;
  readonly document: string;
  readonly rulesetVersion: typeof RULESET_VERSION;
  readonly rulesetDigest: typeof RULESET_DIGEST;
  readonly stage: ValidationStage;
  /** Canonical versioned Project Interpretation URL for a business-rule diagnostic. @example "https://pint-anz.0v.com.au/rules/1.1.2/ibr-004" */
  readonly remediationUrl?: string;
}

export interface ValidationResult {
  readonly document: string;
  readonly documentType: DocumentType;
  readonly rulesetVersion: typeof RULESET_VERSION;
  readonly rulesetDigest: typeof RULESET_DIGEST;
  /** True only when XSD and both official Schematron transforms completed. */
  readonly complete: boolean;
  /** True only for a complete validation with no error diagnostics. */
  readonly valid: boolean;
  readonly diagnostics: readonly Diagnostic[];
}

export interface ValidateFileOptions {
  /** Prepared offline directory containing ubl-2.1/ and compiled sef/ files. */
  readonly rulesetDirectory?: string;
  /** Defensive input cap; this is a tool policy, not a PINT A-NZ rule. */
  readonly maxDocumentBytes?: number;
}

export interface ValidateDocumentOptions extends ValidateFileOptions {
  /** Name reported in diagnostics for in-memory XML. */
  readonly documentName?: string;
}

export type DocumentContent = string | Uint8Array;

export interface RulesetInstallOptions {
  /** Read the official PINT resources archive from disk instead of downloading it. */
  readonly resourcesArchive?: string;
  /** Read the official UBL 2.1 archive from disk instead of downloading it. */
  readonly ublArchive?: string;
  /** Cache root. Primarily useful for controlled CI and tests. */
  readonly cacheDirectory?: string;
  /** Refuse all network access. */
  readonly offline?: boolean;
}

export interface InstalledRuleset {
  readonly name: typeof RULESET_NAME;
  readonly version: typeof RULESET_VERSION;
  readonly directory: string;
  readonly resourcesSha256: string;
  readonly ublSha256: string;
  readonly installedAt: string;
  /** Hashes of extracted validation inputs and compiled transforms. */
  readonly files: Readonly<Record<string, string>>;
}
