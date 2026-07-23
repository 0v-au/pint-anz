import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildSnapshot, serializedSnapshot } from "../scripts/build-snapshot.mjs";
import snapshot from "../src/rules.snapshot.json" with { type: "json" };
import schema from "../content/schema.json" with { type: "json" };
import vocabulary from "../content/vocabulary.json" with { type: "json" };

const inventory = JSON.parse(readFileSync(new URL("../../conformance/rule-inventory.json", import.meta.url), "utf8"));
const coverage = JSON.parse(readFileSync(new URL("../../conformance/coverage.json", import.meta.url), "utf8"));
const fixtures = JSON.parse(readFileSync(new URL("../../fixtures/manifest.json", import.meta.url), "utf8"));
const lock = JSON.parse(readFileSync(new URL("../../conformance/artefacts.lock.json", import.meta.url), "utf8"));
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

function withTemporaryProjection(test: (root: string, input: Record<string, unknown>) => void) {
  const root = mkdtempSync(join(tmpdir(), "pint-anz-rules-"));
  const input: Record<string, unknown> = {
    inventory: structuredClone(inventory),
    coverage: structuredClone(coverage),
    fixtures: structuredClone(fixtures),
    lock: structuredClone(lock),
    packageJson: structuredClone(packageJson),
    vocabulary: structuredClone(vocabulary),
    review: JSON.parse(readFileSync(new URL("../content/editorial-review.json", import.meta.url), "utf8")),
  };
  try {
    test(root, input);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

function writeTemporaryInput(root: string, input: Record<string, unknown>) {
  const paths: Record<string, string> = {
    inventory: "packages/conformance/rule-inventory.json",
    coverage: "packages/conformance/coverage.json",
    fixtures: "packages/fixtures/manifest.json",
    lock: "packages/conformance/artefacts.lock.json",
    packageJson: "packages/rules/package.json",
    vocabulary: "packages/rules/content/vocabulary.json",
    review: "packages/rules/content/editorial-review.json",
  };
  for (const [key, relativePath] of Object.entries(paths)) {
    const path = join(root, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(input[key], null, 2)}\n`);
  }
}

describe("generated rule snapshot", () => {
  it("keeps the published schema aligned with the controlled vocabulary", () => {
    expect(schema.properties.editorial.properties.primaryTopic.enum).toEqual(vocabulary.topics);
    expect(schema.properties.editorial.properties.relatedTopics.items.enum).toEqual(vocabulary.topics);
    expect(schema.properties.coverage.properties.status.enum).toEqual(vocabulary.coverageStatuses);
  });

  it("is deterministic and carries the pinned provenance", () => {
    expect(serializedSnapshot()).toBe(`${JSON.stringify(snapshot, null, 2)}\n`);
    expect(buildSnapshot().count).toBe(245);
    expect(snapshot.provenance).toEqual({
      rulesetVersion: inventory.rulesetVersion,
      source: packageJson.pintAnz.rulesetSource,
      resources: inventory.resourcesUrl,
      resourcesSha256: inventory.resourcesSha256,
      sources: inventory.sources,
    });
    expect(snapshot.provenance.rulesetVersion).toBe(lock.rulesetVersion);
    const resources = lock.downloads.find((download: { name: string }) => download.name === "resources.zip");
    expect(resources).toMatchObject({ url: inventory.resourcesUrl, sha256: inventory.resourcesSha256 });
    for (const source of Object.values(inventory.sources) as Array<{ path: string; sha256: string }>) {
      expect(lock.files[source.path]).toBe(source.sha256);
    }
  });

  it("is an exact, rights-safe projection of all official identities", () => {
    expect(snapshot.count).toBe(245);
    expect(snapshot.rules).toHaveLength(245);
    expect(snapshot.rules.map((rule) => rule.official.id)).toEqual(inventory.rules.map((rule) => rule.id));
    expect(new Set(snapshot.rules.map((rule) => rule.official.id)).size).toBe(245);
    for (const rule of snapshot.rules) {
      expect(Object.keys(rule).sort()).toEqual(["applicability", "coverage", "editorial", "official"]);
      expect(Object.keys(rule.official).sort()).toEqual(["family", "id", "kind", "ruleset", "rulesetVersion", "severity", "source"]);
      expect(Object.keys(rule.coverage).sort()).toEqual(["fixtureIds", "status"]);
    }
  });

  it("keeps coverage evidence and controlled editorial values valid", () => {
    const fixtureById = new Map(fixtures.fixtures.map((fixture: { id: string }) => [fixture.id, fixture]));
    expect(new Set(fixtures.fixtures.map((fixture: { id: string }) => fixture.id)).size).toBe(fixtures.fixtures.length);
    for (const rule of snapshot.rules) {
      const evidence = coverage.rules[rule.official.id];
      expect(rule.coverage.status).toBe(evidence.status);
      expect(rule.coverage.fixtureIds).toEqual(evidence.fixtures);
      expect(vocabulary.topics).toContain(rule.editorial.primaryTopic);
      expect(new Set(rule.editorial.relatedTopics).size).toBe(rule.editorial.relatedTopics.length);
      expect(rule.editorial.relatedTopics).not.toContain(rule.editorial.primaryTopic);
      for (const topic of rule.editorial.relatedTopics) expect(vocabulary.topics).toContain(topic);
      for (const fixtureId of rule.coverage.fixtureIds) {
        const fixture = fixtureById.get(fixtureId) as { expectedRules: string[]; rulesetVersion: string } | undefined;
        expect(fixture).toBeDefined();
        expect(fixture?.expectedRules).toContain(rule.official.id);
        expect(fixture?.rulesetVersion).toBe(rule.official.rulesetVersion);
      }
    }
  });

  it("rejects duplicate official identities", () => {
    withTemporaryProjection((root, input) => {
      const candidate = input.inventory as { rules: Array<{ id: string }> };
      candidate.rules[1].id = candidate.rules[0].id;
      writeTemporaryInput(root, input);
      expect(() => buildSnapshot(root)).toThrow(/official identities contains duplicates/);
    });
  });

  it("rejects resource provenance that drifts from the trusted artefact lock", () => {
    withTemporaryProjection((root, input) => {
      const candidate = input.inventory as { resourcesSha256: string };
      candidate.resourcesSha256 = "0".repeat(64);
      writeTemporaryInput(root, input);
      expect(() => buildSnapshot(root)).toThrow(/inventory resources provenance does not match the artefact lock/);
    });
  });

  it("rejects source provenance that drifts from the trusted artefact lock", () => {
    withTemporaryProjection((root, input) => {
      const candidate = input.inventory as { sources: { pint: { sha256: string } } };
      candidate.sources.pint.sha256 = "0".repeat(64);
      writeTemporaryInput(root, input);
      expect(() => buildSnapshot(root)).toThrow(/pint source provenance does not match the artefact lock/);
    });
  });

  it("requires both pinned official source records", () => {
    withTemporaryProjection((root, input) => {
      const candidate = input.inventory as { sources: Record<string, unknown> };
      delete candidate.sources.aligned;
      writeTemporaryInput(root, input);
      expect(() => buildSnapshot(root)).toThrow(/must contain exactly aligned and pint records/);
    });
  });

  it("rejects fixture references that do not exist in the fixture corpus", () => {
    withTemporaryProjection((root, input) => {
      const candidate = input.coverage as { rules: Record<string, { fixtures: string[] }> };
      candidate.rules["ibr-004"].fixtures = ["not-a-fixture"];
      writeTemporaryInput(root, input);
      expect(() => buildSnapshot(root)).toThrow(/ibr-004 references unknown fixture not-a-fixture/);
    });
  });

  it("rejects unreviewed coverage from the publishable snapshot", () => {
    withTemporaryProjection((root, input) => {
      const candidate = input.coverage as { rules: Record<string, { status: string }> };
      candidate.rules["ibr-004"].status = "unreviewed";
      writeTemporaryInput(root, input);
      expect(() => buildSnapshot(root)).toThrow(/ibr-004 has unreviewed coverage/);
    });
  });

  it("rejects a malformed public source URI", () => {
    withTemporaryProjection((root, input) => {
      const candidate = input.packageJson as { pintAnz: { rulesetSource: string } };
      candidate.pintAnz.rulesetSource = "not a URI";
      writeTemporaryInput(root, input);
      expect(() => buildSnapshot(root)).toThrow(/official.source must be an absolute URI/);
    });
  });

  it("rejects related topics outside the controlled vocabulary", () => {
    withTemporaryProjection((root, input) => {
      const candidate = input.review as { groups: Array<{ relatedTopics?: string[] }> };
      candidate.groups[0].relatedTopics = ["free-form-topic"];
      writeTemporaryInput(root, input);
      expect(() => buildSnapshot(root)).toThrow(/related topics contains unknown value free-form-topic/);
    });
  });
});
