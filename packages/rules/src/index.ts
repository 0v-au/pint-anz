import snapshot from "./rules.snapshot.json" with { type: "json" };
import type { RuleCatalogueEntry, RuleFilters } from "./types.js";

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/** Immutable, version-pinned Rule Catalogue. */
export const rules: readonly RuleCatalogueEntry[] = deepFreeze(
  snapshot.rules as RuleCatalogueEntry[],
);

const rulesById = new Map(rules.map((rule) => [rule.official.id, rule]));

/** Return one Rule Catalogue Entry, or `undefined` for an Unknown Rule. */
export function getRule(id: string): RuleCatalogueEntry | undefined {
  return rulesById.get(id);
}

/** Find Rule Catalogue Entries matching every supplied filter. */
export function findRules(filters: RuleFilters = {}): readonly RuleCatalogueEntry[] {
  return rules.filter((rule) => {
    const topics = [rule.editorial.primaryTopic, ...rule.editorial.relatedTopics];
    return (
      (filters.version === undefined || rule.official.rulesetVersion === filters.version) &&
      (filters.jurisdiction === undefined || rule.applicability.jurisdictions.includes(filters.jurisdiction)) &&
      (filters.documentType === undefined || rule.applicability.documentTypes.includes(filters.documentType)) &&
      (filters.topic === undefined || topics.includes(filters.topic)) &&
      (filters.severity === undefined || rule.official.severity === filters.severity) &&
      (filters.family === undefined || rule.official.family === filters.family) &&
      (filters.coverage === undefined || rule.coverage.status === filters.coverage) &&
      (filters.editorialState === undefined || rule.editorial.state === filters.editorialState)
    );
  });
}

export type {
  EditorialState,
  OfficialRule,
  RuleApplicability,
  RuleCatalogueEntry,
  RuleCoverage,
  RuleCoverageStatus,
  RuleDocumentType,
  RuleEditorial,
  RuleFilters,
  RuleGuidance,
  RuleJurisdiction,
  RuleTopic,
} from "./types.js";
