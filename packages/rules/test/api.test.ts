import { describe, expect, it } from "vitest";

import { findRules, getRule, rules } from "../src/index.js";
import { matchesRuleFilters } from "../src/matches.js";
import type { RuleCatalogueEntry, RuleFilters } from "../src/types.js";

describe("Rule Catalogue API", () => {
  it("exposes exactly 245 deeply immutable entries", () => {
    expect(rules).toHaveLength(245);
    expect(Object.isFrozen(rules)).toBe(true);

    const example = getRule("ibr-004");
    expect(example).toBeDefined();
    expect(Object.isFrozen(example)).toBe(true);
    expect(Object.isFrozen(example?.official)).toBe(true);
    expect(Object.isFrozen(example?.coverage.fixtureIds)).toBe(true);
    expect(Object.isFrozen(example?.applicability.jurisdictions)).toBe(true);
    expect(Object.isFrozen(example?.editorial.relatedTopics)).toBe(true);
  });

  it("returns an entry by identifier and undefined for an Unknown Rule", () => {
    expect(getRule("ibr-004")?.official.id).toBe("ibr-004");
    expect(getRule("not-a-pint-rule")).toBeUndefined();
  });

  it("proves every individual filter against every returned entry", () => {
    const cases: Array<{ filters: RuleFilters; matches: (rule: RuleCatalogueEntry) => boolean }> = [
      { filters: { version: "1.1.2" }, matches: (rule) => rule.official.rulesetVersion === "1.1.2" },
      { filters: { jurisdiction: "AU" }, matches: (rule) => rule.applicability.jurisdictions.includes("AU") },
      { filters: { documentType: "invoice" }, matches: (rule) => rule.applicability.documentTypes.includes("invoice") },
      { filters: { topic: "tax" }, matches: (rule) => [rule.editorial.primaryTopic, ...rule.editorial.relatedTopics].includes("tax") },
      { filters: { severity: "fatal" }, matches: (rule) => rule.official.severity === "fatal" },
      { filters: { family: "pint-business" }, matches: (rule) => rule.official.family === "pint-business" },
      { filters: { coverage: "invalid-covered" }, matches: (rule) => rule.coverage.status === "invalid-covered" },
      { filters: { editorialState: "pending" }, matches: (rule) => rule.editorial.state === "pending" },
    ];
    for (const { filters, matches } of cases) {
      const found = findRules(filters);
      expect(found.length).toBeGreaterThan(0);
      expect(found.every(matches)).toBe(true);
    }
    expect(findRules({ version: "0.0.0" })).toEqual([]);
  });

  it("matches related topics and combines filters with AND semantics", () => {
    const related: RuleCatalogueEntry = {
      ...rules[0],
      editorial: { ...rules[0].editorial, primaryTopic: "general", relatedTopics: ["tax"] },
    };
    expect(matchesRuleFilters(related, { topic: "tax" })).toBe(true);
    expect(matchesRuleFilters(related, { topic: "codelists" })).toBe(false);

    const found = findRules({ jurisdiction: "A-NZ", documentType: "invoice", topic: "tax", coverage: "invalid-covered" });
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((rule) => (
      rule.applicability.jurisdictions.includes("A-NZ")
      && rule.applicability.documentTypes.includes("invoice")
      && [rule.editorial.primaryTopic, ...rule.editorial.relatedTopics].includes("tax")
      && rule.coverage.status === "invalid-covered"
    ))).toBe(true);
  });
});
