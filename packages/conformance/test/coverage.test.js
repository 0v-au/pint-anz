/**
 * Consistency checks between rule-inventory.json, coverage.json, and the
 * fixtures manifest. CI fails when any of the three drift apart.
 */
import { describe, expect, it } from "vitest";
import { manifest } from "@pint-anz/fixtures";
import coverage from "../coverage.json" with { type: "json" };
import inventory from "../rule-inventory.json" with { type: "json" };

const fixturesById = new Map(manifest.fixtures.map((fixture) => [fixture.id, fixture]));
const inventoryIds = new Set(inventory.rules.map((rule) => rule.id));

describe("coverage bookkeeping", () => {
  it("tracks exactly the rules in the inventory", () => {
    expect(Object.keys(coverage.rules).sort()).toEqual([...inventoryIds].sort());
  });

  it("pins the same ruleset version everywhere", () => {
    expect(coverage.rulesetVersion).toBe(inventory.rulesetVersion);
    expect(manifest.ruleset.version).toBe(inventory.rulesetVersion);
  });

  it("uses only known statuses, with justification where required", () => {
    const known = new Set(Object.keys(coverage.statuses));
    for (const [id, entry] of Object.entries(coverage.rules)) {
      expect(known, `${id}: unknown status ${entry.status}`).toContain(entry.status);
      if (["valid-covered", "not-applicable", "blocked"].includes(entry.status)) {
        expect(entry.justification, `${id}: ${entry.status} requires a justification`).not.toBe("");
      }
    }
  });

  it("invalid-covered rules list real single-rule negative fixtures", () => {
    for (const [id, entry] of Object.entries(coverage.rules)) {
      if (entry.status !== "invalid-covered") continue;
      expect(entry.fixtures.length, `${id}: needs at least one fixture`).toBeGreaterThan(0);
      for (const fixtureId of entry.fixtures) {
        const fixture = fixturesById.get(fixtureId);
        expect(fixture, `${id}: fixture ${fixtureId} missing from manifest`).toBeDefined();
        expect(fixture.expectation, `${id}: ${fixtureId} must be invalid`).toBe("invalid");
        expect(fixture.expectedRules, `${id}: ${fixtureId} must target exactly this rule`).toEqual([id]);
      }
    }
  });

  it("valid-covered rules list real valid fixtures", () => {
    for (const [id, entry] of Object.entries(coverage.rules)) {
      if (entry.status !== "valid-covered") continue;
      expect(entry.fixtures.length, `${id}: needs at least one exercising fixture`).toBeGreaterThan(0);
      for (const fixtureId of entry.fixtures) {
        const fixture = fixturesById.get(fixtureId);
        expect(fixture, `${id}: fixture ${fixtureId} missing from manifest`).toBeDefined();
        expect(fixture.expectation, `${id}: ${fixtureId} must be valid`).toBe("valid");
      }
    }
  });

  it("every invalid fixture's declared rule is tracked as invalid-covered", () => {
    for (const fixture of manifest.fixtures) {
      if (fixture.expectation !== "invalid") continue;
      for (const ruleId of fixture.expectedRules) {
        expect(inventoryIds, `${fixture.id}: unknown rule ${ruleId}`).toContain(ruleId);
        const entry = coverage.rules[ruleId];
        expect(entry.status, `${ruleId}: has fixture ${fixture.id} but is not invalid-covered`).toBe(
          "invalid-covered",
        );
        expect(entry.fixtures, `${ruleId}: coverage must list ${fixture.id}`).toContain(fixture.id);
      }
    }
  });
});
