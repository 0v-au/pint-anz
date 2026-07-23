import type { RuleCatalogueEntry, RuleFilters } from "./types.js";

/** Return whether one Rule Catalogue Entry satisfies every supplied filter. */
export function matchesRuleFilters(rule: RuleCatalogueEntry, filters: RuleFilters): boolean {
  const topics = [rule.editorial.primaryTopic, ...rule.editorial.relatedTopics];
  return (
    (filters.version === undefined || rule.official.rulesetVersion === filters.version)
    && (filters.jurisdiction === undefined || rule.applicability.jurisdictions.includes(filters.jurisdiction))
    && (filters.documentType === undefined || rule.applicability.documentTypes.includes(filters.documentType))
    && (filters.topic === undefined || topics.includes(filters.topic))
    && (filters.severity === undefined || rule.official.severity === filters.severity)
    && (filters.family === undefined || rule.official.family === filters.family)
    && (filters.coverage === undefined || rule.coverage.status === filters.coverage)
    && (filters.editorialState === undefined || rule.editorial.state === filters.editorialState)
  );
}
