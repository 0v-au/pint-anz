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
  /** Immutable authoritative ruleset URL, pinned by rulesetVersion. @example "https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/" */
  readonly source: string;
}

/** Reviewed fixture evidence for one Official Rule. */
export interface RuleCoverage {
  /** Coverage classification. @example "invalid-covered" */
  readonly status: RuleCoverageStatus;
  /** Fixture identifiers supporting the classification. @example ["ibr-004"] */
  readonly fixtureIds: readonly string[];
}

/** Explicitly reviewed applicability; unknown values are retained rather than inferred. */
export interface RuleApplicability {
  /** Applicable jurisdictions. @example ["A-NZ"] */
  readonly jurisdictions: readonly RuleJurisdiction[];
  /** Applicable billing document types. @example ["unknown"] */
  readonly documentTypes: readonly RuleDocumentType[];
}

/** Project-controlled classification, separate from official and conformance facts. */
export interface RuleEditorial {
  /** Single primary topic. @example "codelists" */
  readonly primaryTopic: RuleTopic;
  /** Additional controlled topics. @example [] */
  readonly relatedTopics: readonly RuleTopic[];
  /** Whether independently authored guidance has passed review. @example "pending" */
  readonly state: EditorialState;
}

/** Optional independently authored Project Interpretation. */
export interface ProjectInterpretation {
  /** Project-authored page title. @example "Choose the invoice type code deliberately" */
  readonly title: string;
  /** Concise project interpretation, not official wording. @example "Check the invoice type code." */
  readonly summary: string;
  /** Independently observed causes. @example ["The type code is absent."] */
  readonly commonCauses: readonly string[];
  /** Independently authored correction guidance. @example "Add a supported type code and validate again." */
  readonly fix: string;
  /** UBL terms affected by the correction. @example ["cbc:InvoiceTypeCode"] */
  readonly affectedTerms: readonly string[];
  /** Exact immutable OpenPeppol rule page for the pinned transaction ruleset. @example "https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/ibr-004/" */
  readonly officialRuleUrl: string;
  /** Validator-backed failing fragment and its complete fixture. @example {"fixtureId":"ibr-004-missing-type-code","xml":"<!-- omitted -->"} */
  readonly failingExample: {
    readonly fixtureId: string;
    readonly xml: string;
  };
  /** Corrected fragment exercised in the complete synthetic document. @example {"xml":"<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>"} */
  readonly correctedExample: {
    readonly xml: string;
  };
}

/** Public, rights-safe record for one Official Rule. */
export interface RuleCatalogueEntry {
  /** Official identity and source provenance. @example {"id":"ibr-004","rulesetVersion":"1.1.2"} */
  readonly official: OfficialRule;
  /** Reviewed conformance evidence. @example {"status":"invalid-covered","fixtureIds":["ibr-004"]} */
  readonly coverage: RuleCoverage;
  /** Explicit project applicability review. @example {"jurisdictions":["A-NZ"],"documentTypes":["invoice","credit-note"]} */
  readonly applicability: RuleApplicability;
  /** Project editorial classification and readiness. @example {"primaryTopic":"codelists","relatedTopics":[],"state":"pending"} */
  readonly editorial: RuleEditorial;
  /** Optional Project Interpretation; absent while pending. @example {"summary":"Check the invoice type code.","commonCauses":["The type code is absent."],"fix":"Add a supported type code and validate again."} */
  readonly guidance?: ProjectInterpretation;
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
