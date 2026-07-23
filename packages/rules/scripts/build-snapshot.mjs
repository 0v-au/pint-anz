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

function assertArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be a non-empty string`);
}

function assertUri(value, label) {
  assertNonEmptyString(value, label);
  try {
    new URL(value);
  } catch {
    fail(`${label} must be an absolute URI`);
  }
}

function assertExactKeys(value, required, optional, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  const allowed = new Set([...required, ...optional]);
  for (const key of required) if (!(key in value)) fail(`${label} is missing ${key}`);
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail(`${label} has unexpected ${key}`);
}

function validateCatalogueEntry(entry, vocabulary, label) {
  assertExactKeys(entry, ["official", "coverage", "applicability", "editorial"], ["guidance"], label);
  assertExactKeys(entry.official, ["id", "rulesetVersion", "ruleset", "family", "kind", "severity", "source"], [], `${label}.official`);
  for (const key of ["id", "rulesetVersion", "family", "severity", "source"]) assertNonEmptyString(entry.official[key], `${label}.official.${key}`);
  assertUri(entry.official.source, `${label}.official.source`);
  assertAllowed([entry.official.ruleset], ["pint", "aligned"], `${label}.official.ruleset`);
  assertAllowed([entry.official.kind], ["assert", "report"], `${label}.official.kind`);
  assertExactKeys(entry.coverage, ["status", "fixtureIds"], [], `${label}.coverage`);
  assertAllowed([entry.coverage.status], vocabulary.coverageStatuses, `${label}.coverage.status`);
  assertArray(entry.coverage.fixtureIds, `${label}.coverage.fixtureIds`);
  unique(entry.coverage.fixtureIds, `${label}.coverage.fixtureIds`);
  for (const fixtureId of entry.coverage.fixtureIds) assertNonEmptyString(fixtureId, `${label}.coverage.fixtureId`);
  assertExactKeys(entry.applicability, ["jurisdictions", "documentTypes"], [], `${label}.applicability`);
  for (const [key, allowed] of [["jurisdictions", vocabulary.jurisdictions], ["documentTypes", vocabulary.documentTypes]]) {
    const values = entry.applicability[key];
    assertArray(values, `${label}.applicability.${key}`);
    if (values.length === 0) fail(`${label}.applicability.${key} must not be empty`);
    unique(values, `${label}.applicability.${key}`);
    assertAllowed(values, allowed, `${label}.applicability.${key}`);
  }
  assertExactKeys(entry.editorial, ["primaryTopic", "relatedTopics", "state"], [], `${label}.editorial`);
  assertAllowed([entry.editorial.primaryTopic], vocabulary.topics, `${label}.editorial.primaryTopic`);
  assertArray(entry.editorial.relatedTopics, `${label}.editorial.relatedTopics`);
  unique(entry.editorial.relatedTopics, `${label}.editorial.relatedTopics`);
  assertAllowed(entry.editorial.relatedTopics, vocabulary.topics, `${label}.editorial.relatedTopics`);
  if (entry.editorial.relatedTopics.includes(entry.editorial.primaryTopic)) fail(`${label}.editorial.relatedTopics repeats the primary topic`);
  assertAllowed([entry.editorial.state], vocabulary.editorialStates, `${label}.editorial.state`);
  if (entry.guidance !== undefined) {
    assertExactKeys(entry.guidance, ["summary", "commonCauses", "fix"], [], `${label}.guidance`);
    assertNonEmptyString(entry.guidance.summary, `${label}.guidance.summary`);
    assertNonEmptyString(entry.guidance.fix, `${label}.guidance.fix`);
    assertArray(entry.guidance.commonCauses, `${label}.guidance.commonCauses`);
    for (const cause of entry.guidance.commonCauses) assertNonEmptyString(cause, `${label}.guidance.commonCause`);
  }
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

  const resources = lock.downloads.find((download) => download.name === "resources.zip");
  if (!resources) fail("artefact lock does not contain resources.zip");
  if (inventory.resourcesUrl !== resources.url || inventory.resourcesSha256 !== resources.sha256) {
    fail("inventory resources provenance does not match the artefact lock");
  }
  if (!["aligned", "pint"].every((ruleset) => ruleset in inventory.sources) || Object.keys(inventory.sources).length !== 2) {
    fail("inventory source provenance must contain exactly aligned and pint records");
  }
  for (const [ruleset, source] of Object.entries(inventory.sources)) {
    if (lock.files[source.path] !== source.sha256) {
      fail(`${ruleset} source provenance does not match the artefact lock`);
    }
  }

  if (inventory.rules.length !== 245 || inventory.counts.total !== 245) {
    fail(`expected exactly 245 identities, found ${inventory.rules.length}`);
  }
  const identityIds = inventory.rules.map((rule) => rule.id);
  unique(identityIds, "official identities");

  const reviewById = new Map();
  for (const group of review.groups) {
    assertArray(group.ruleIds, "editorial review rule IDs");
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

  unique(manifest.fixtures.map((fixture) => fixture.id), "fixture identifiers");
  const fixtureById = new Map(manifest.fixtures.map((fixture) => [fixture.id, fixture]));
  const coverageIds = Object.keys(coverage.rules);
  unique(coverageIds, "coverage identities");
  if (coverageIds.length !== 245 || coverageIds.some((id) => !identityIds.includes(id))) {
    fail("coverage identities do not exactly match the official projection");
  }

  const source = packageJson.pintAnz.rulesetSource;
  assertNonEmptyString(source, "package ruleset source");
  const rules = inventory.rules.map((official) => {
    const evidence = coverage.rules[official.id];
    if (!evidence) fail(`missing coverage for ${official.id}`);
    if (evidence.status === "unreviewed") fail(`${official.id} has unreviewed coverage`);
    unique(evidence.fixtures, `${official.id} fixture references`);
    for (const fixtureId of evidence.fixtures) {
      const fixture = fixtureById.get(fixtureId);
      if (!fixture) fail(`${official.id} references unknown fixture ${fixtureId}`);
      if (!fixture.expectedRules.includes(official.id)) {
        fail(`${fixtureId} does not declare ${official.id} in expectedRules`);
      }
      unique(fixture.expectedRules, `${fixtureId} expected rules`);
      if (fixture.rulesetVersion !== version) fail(`${fixtureId} has mismatched ruleset version`);
    }
    const editorial = reviewById.get(official.id);
    const relatedTopics = editorial.relatedTopics ?? [];
    assertArray(relatedTopics, `${official.id} related topics`);
    assertAllowed(relatedTopics, vocabulary.topics, `${official.id} related topics`);
    unique(relatedTopics, `${official.id} related topics`);
    if (relatedTopics.includes(editorial.primaryTopic)) fail(`${official.id} related topics repeats primary topic`);
    const rule = {
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
        relatedTopics: [...relatedTopics],
        state: review.guidanceState,
      },
    };
    validateCatalogueEntry(rule, vocabulary, `rule ${official.id}`);
    return rule;
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
