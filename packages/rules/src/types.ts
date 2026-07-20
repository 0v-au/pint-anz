/** Jurisdiction applicability explicitly reviewed by this project. */
export type RuleJurisdiction = "AU" | "NZ" | "A-NZ" | "unknown";

/** Billing document applicability explicitly reviewed by this project. */
export type RuleDocumentType = "invoice" | "credit-note" | "unknown";

/** Project editorial readiness, independent of conformance coverage. */
export type EditorialState = "pending" | "reviewed";

/** Reviewed conformance relationship between a rule and the fixture corpus. */
export type RuleCoverageStatus =
  | "invalid-covered"
  | "valid-covered"
  | "not-applicable"
  | "blocked"
  | "unreviewed";

/** Controlled topic assigned by a project editor. */
export type RuleTopic =
  | "allowances-and-charges"
  | "amounts-and-totals"
  | "attachments"
  | "codelists"
  | "dates-and-periods"
  | "general"
  | "identifiers"
  | "invoice-lines"
  | "parties-and-addresses"
  | "payment"
  | "references"
  | "tax"
  | "unclassified";

/** Rights-safe identity and provenance of an Official Rule. */
export interface OfficialRule {
  /** Version-specific official identifier. @example "ibr-004" */
  readonly id: string;
  /** Pinned PINT A-NZ ruleset version. @example "1.1.2" */
  readonly rulesetVersion: string;
  /** Official source ruleset within the pinned bundle. @example "pint" */
  readonly ruleset: "pint" | "aligned";
  /** Rights-safe project grouping supplied by the conformance projection. @example "pint-business" */
  readonly family: string;
  /** Schematron rule kind, without its expression. @example "assert" */
  readonly kind: "assert" | "report";
  /** Official diagnostic severity. @example "fatal" */
  readonly severity: string;
  /** Authoritative versioned ruleset URL. @example "https://docs.peppol.eu/poac/aunz/pint-aunz/1.1.2/" */
  readonly source: string;
}

/** Reviewed fixture evidence for one Official Rule. */
export interface RuleCoverage {
  /** Coverage classification. @example "invalid-covered" */
  readonly status: RuleCoverageStatus;
  /** Fixture identifiers supporting the classification. @example ["ibr-004-missing-type-code"] */
  readonly fixtureIds: readonly string[];
}

/** Explicitly reviewed applicability; unknown values are retained rather than inferred. */
export interface RuleApplicability {
  /** Applicable jurisdictions. @example ["unknown"] */
  readonly jurisdictions: readonly RuleJurisdiction[];
  /** Applicable billing document types. @example ["unknown"] */
  readonly documentTypes: readonly RuleDocumentType[];
}

/** Project-controlled classification, separate from official and conformance facts. */
export interface RuleEditorial {
  /** Single primary topic. @example "unclassified" */
  readonly primaryTopic: RuleTopic;
  /** Additional controlled topics. @example [] */
  readonly relatedTopics: readonly RuleTopic[];
  /** Whether independently authored guidance has passed review. @example "pending" */
  readonly state: EditorialState;
}

/** Optional independently authored Project Interpretation. */
export interface RuleGuidance {
  /** Concise project interpretation, not official wording. @example "Check the invoice type code." */
  readonly summary: string;
  /** Independently observed causes. @example ["The type code is absent."] */
  readonly commonCauses: readonly string[];
  /** Independently authored correction guidance. @example "Add a supported type code and validate again." */
  readonly fix: string;
}

/** Public, rights-safe record for one Official Rule. */
export interface RuleCatalogueEntry {
  /** Official identity and source provenance. */
  readonly official: OfficialRule;
  /** Reviewed conformance evidence. */
  readonly coverage: RuleCoverage;
  /** Explicit project applicability review. */
  readonly applicability: RuleApplicability;
  /** Project editorial classification and readiness. */
  readonly editorial: RuleEditorial;
  /** Optional Project Interpretation; absent while pending. */
  readonly guidance?: RuleGuidance;
}

/** Filters supported by {@link findRules}; all supplied fields are combined with AND. */
export interface RuleFilters {
  /** Match ruleset version exactly. @example "1.1.2" */
  readonly version?: string;
  /** Match an explicitly reviewed jurisdiction. @example "AU" */
  readonly jurisdiction?: RuleJurisdiction;
  /** Match an explicitly reviewed document type. @example "invoice" */
  readonly documentType?: RuleDocumentType;
  /** Match the primary or a related controlled topic. @example "tax" */
  readonly topic?: RuleTopic;
  /** Match diagnostic severity exactly. @example "fatal" */
  readonly severity?: string;
  /** Match rights-safe rule family exactly. @example "pint-business" */
  readonly family?: string;
  /** Match reviewed conformance coverage exactly. @example "invalid-covered" */
  readonly coverage?: RuleCoverageStatus;
  /** Match project editorial readiness exactly. @example "pending" */
  readonly editorialState?: EditorialState;
}
