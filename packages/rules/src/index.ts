import snapshot from "./rules.snapshot.json" with { type: "json" };
import { matchesRuleFilters } from "./matches.js";
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
  return rules.filter((rule) => matchesRuleFilters(rule, filters));
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
  ProjectInterpretation,
  RuleJurisdiction,
  RuleTopic,
} from "./types.js";
