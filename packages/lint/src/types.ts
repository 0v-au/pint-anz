export const RULESET_VERSION = "1.1.2" as const;

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
  readonly stage: ValidationStage;
}

export interface ValidationResult {
  readonly document: string;
  readonly documentType: DocumentType;
  readonly rulesetVersion: typeof RULESET_VERSION;
  /** True only when XSD and both official Schematron transforms completed. */
  readonly complete: boolean;
  /** True only for a complete validation with no error diagnostics. */
  readonly valid: boolean;
  readonly diagnostics: readonly Diagnostic[];
}

export interface ValidateFileOptions {
  /** Prepared offline directory containing ubl-2.1/ and compiled sef/ files. */
  readonly rulesetDirectory: string;
  /** Defensive input cap; this is a tool policy, not a PINT A-NZ rule. */
  readonly maxDocumentBytes?: number;
}
