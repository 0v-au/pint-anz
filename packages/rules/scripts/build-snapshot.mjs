#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "../..");
const outputPath = join(packageRoot, "src/rules.snapshot.json");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fail(message) {
  throw new Error(`Rule snapshot: ${message}`);
}

function unique(values, label) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length > 0) fail(`${label} contains duplicates: ${[...new Set(duplicates)].join(", ")}`);
}

function assertAllowed(values, allowed, label) {
  for (const value of values) if (!allowed.includes(value)) fail(`${label} contains unknown value ${value}`);
}

export function buildSnapshot(root = repoRoot) {
  const inventory = readJson(join(root, "packages/conformance/rule-inventory.json"));
  const coverage = readJson(join(root, "packages/conformance/coverage.json"));
  const manifest = readJson(join(root, "packages/fixtures/manifest.json"));
  const lock = readJson(join(root, "packages/conformance/artefacts.lock.json"));
  const packageJson = readJson(join(root, "packages/rules/package.json"));
  const vocabulary = readJson(join(root, "packages/rules/content/vocabulary.json"));
  const review = readJson(join(root, "packages/rules/content/editorial-review.json"));

  const version = inventory.rulesetVersion;
  for (const [label, candidate] of [
    ["coverage", coverage.rulesetVersion],
    ["fixture manifest", manifest.ruleset.version],
    ["artefact lock", lock.rulesetVersion],
    ["package metadata", packageJson.pintAnz.rulesetVersion],
    ["editorial review", review.rulesetVersion],
  ]) if (candidate !== version) fail(`${label} version ${candidate} does not match ${version}`);

  if (inventory.rules.length !== 245 || inventory.counts.total !== 245) {
    fail(`expected exactly 245 identities, found ${inventory.rules.length}`);
  }
  const identityIds = inventory.rules.map((rule) => rule.id);
  unique(identityIds, "official identities");

  const reviewById = new Map();
  for (const group of review.groups) {
    assertAllowed([group.primaryTopic], vocabulary.topics, "primary topic");
    assertAllowed(group.jurisdictions, vocabulary.jurisdictions, `${group.primaryTopic} jurisdictions`);
    assertAllowed(group.documentTypes, vocabulary.documentTypes, `${group.primaryTopic} document types`);
    unique(group.ruleIds, `${group.primaryTopic} reviewed identities`);
    for (const id of group.ruleIds) {
      if (reviewById.has(id)) fail(`editorial review classifies ${id} more than once`);
      reviewById.set(id, group);
    }
  }
  const missingReviews = identityIds.filter((id) => !reviewById.has(id));
  const unknownReviews = [...reviewById.keys()].filter((id) => !identityIds.includes(id));
  if (missingReviews.length > 0) fail(`missing explicit editorial review: ${missingReviews.join(", ")}`);
  if (unknownReviews.length > 0) fail(`editorial review contains unknown identities: ${unknownReviews.join(", ")}`);

  const fixtureById = new Map(manifest.fixtures.map((fixture) => [fixture.id, fixture]));
  const coverageIds = Object.keys(coverage.rules);
  unique(coverageIds, "coverage identities");
  if (coverageIds.length !== 245 || coverageIds.some((id) => !identityIds.includes(id))) {
    fail("coverage identities do not exactly match the official projection");
  }

  const source = packageJson.pintAnz.rulesetSource;
  const rules = inventory.rules.map((official) => {
    const evidence = coverage.rules[official.id];
    if (!evidence) fail(`missing coverage for ${official.id}`);
    unique(evidence.fixtures, `${official.id} fixture references`);
    for (const fixtureId of evidence.fixtures) {
      const fixture = fixtureById.get(fixtureId);
      if (!fixture) fail(`${official.id} references unknown fixture ${fixtureId}`);
      if (!fixture.expectedRules.includes(official.id)) {
        fail(`${fixtureId} does not declare ${official.id} in expectedRules`);
      }
      if (fixture.rulesetVersion !== version) fail(`${fixtureId} has mismatched ruleset version`);
    }
    const editorial = reviewById.get(official.id);
    return {
      official: {
        id: official.id,
        rulesetVersion: version,
        ruleset: official.ruleset,
        family: official.family,
        kind: official.kind,
        severity: official.severity,
        source,
      },
      coverage: {
        status: evidence.status,
        fixtureIds: [...evidence.fixtures],
      },
      applicability: {
        jurisdictions: [...editorial.jurisdictions],
        documentTypes: [...editorial.documentTypes],
      },
      editorial: {
        primaryTopic: editorial.primaryTopic,
        relatedTopics: [],
        state: review.guidanceState,
      },
    };
  });

  return {
    _generated: {
      notice: "Generated by packages/rules/scripts/build-snapshot.mjs; do not edit by hand.",
      schemaVersion: 1,
      reviewedAt: review.reviewedAt,
    },
    provenance: {
      rulesetVersion: version,
      source,
      resources: inventory.resourcesUrl,
      resourcesSha256: inventory.resourcesSha256,
      sources: inventory.sources,
    },
    count: rules.length,
    rules,
  };
}

export function serializedSnapshot(root = repoRoot) {
  return `${JSON.stringify(buildSnapshot(root), null, 2)}\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const expected = serializedSnapshot();
  if (process.argv.includes("--check")) {
    const actual = readFileSync(outputPath, "utf8");
    if (actual !== expected) fail("generated snapshot is stale; run pnpm --filter @pint-anz/rules generate");
    console.log("Rule snapshot is current: 245 rights-safe records.");
  } else {
    writeFileSync(outputPath, expected);
    console.log("Generated 245 rights-safe rule records.");
  }
}
