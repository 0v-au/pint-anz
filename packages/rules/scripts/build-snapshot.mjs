#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { interpretationMetadataKeys, loadInterpretations } from "./interpretations.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "../..");
const outputPath = join(packageRoot, "src/rules.snapshot.json");
const gapReportPath = join(packageRoot, "content/interpretation-gaps.generated.json");
const immutableReleaseRoot = "https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/";

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
    assertExactKeys(
      entry.guidance,
      [
        "title",
        "summary",
        "commonCauses",
        "fix",
        "affectedTerms",
        "officialRuleUrl",
        "failingExample",
        "correctedExample",
      ],
      [],
      `${label}.guidance`,
    );
    for (const key of ["title", "summary", "fix"]) {
      assertNonEmptyString(entry.guidance[key], `${label}.guidance.${key}`);
    }
    assertArray(entry.guidance.commonCauses, `${label}.guidance.commonCauses`);
    for (const cause of entry.guidance.commonCauses) assertNonEmptyString(cause, `${label}.guidance.commonCause`);
    assertArray(entry.guidance.affectedTerms, `${label}.guidance.affectedTerms`);
    if (entry.guidance.affectedTerms.length === 0) fail(`${label}.guidance.affectedTerms must not be empty`);
    unique(entry.guidance.affectedTerms, `${label}.guidance.affectedTerms`);
    for (const term of entry.guidance.affectedTerms) assertNonEmptyString(term, `${label}.guidance.affectedTerm`);
    assertUri(entry.guidance.officialRuleUrl, `${label}.guidance.officialRuleUrl`);
    assertExactKeys(entry.guidance.failingExample, ["fixtureId", "xml"], [], `${label}.guidance.failingExample`);
    assertNonEmptyString(entry.guidance.failingExample.fixtureId, `${label}.guidance.failingExample.fixtureId`);
    assertNonEmptyString(entry.guidance.failingExample.xml, `${label}.guidance.failingExample.xml`);
    assertExactKeys(entry.guidance.correctedExample, ["xml"], [], `${label}.guidance.correctedExample`);
    assertNonEmptyString(entry.guidance.correctedExample.xml, `${label}.guidance.correctedExample.xml`);
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
  const interpretations = loadInterpretations(join(root, "packages/rules"));

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
  if (
    packageJson.pintAnz.rulesetSource !== immutableReleaseRoot
    || packageJson.pintAnz.rulesetResources !== `${immutableReleaseRoot}resources.zip`
  ) fail(`package provenance must use the immutable 2025-Q4 archive for ruleset ${version}`);
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

  const interpretationsById = new Map();
  for (const interpretation of interpretations) {
    const { metadata } = interpretation;
    assertExactKeys(metadata, interpretationMetadataKeys.filter((key) => key !== "reviewedAt"), ["reviewedAt"], `interpretation ${metadata.ruleId ?? "unknown"}`);
    if (metadata.schemaVersion !== 1) fail(`${metadata.ruleId}: unsupported interpretation schema version`);
    assertNonEmptyString(metadata.ruleId, "interpretation ruleId");
    if (interpretationsById.has(metadata.ruleId)) fail(`duplicate interpretation ${metadata.ruleId}`);
    if (!identityIds.includes(metadata.ruleId)) fail(`interpretation contains Unknown Rule ${metadata.ruleId}`);
    if (metadata.rulesetVersion !== version) fail(`${metadata.ruleId}: interpretation version does not match ${version}`);
    if (metadata.editorialState !== "reviewed") fail(`${metadata.ruleId}: fixture-backed interpretation must be reviewed`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.reviewedAt)) fail(`${metadata.ruleId}: reviewedAt must use yyyy-mm-dd`);
    assertArray(metadata.jurisdictions, `${metadata.ruleId} jurisdictions`);
    assertArray(metadata.documentTypes, `${metadata.ruleId} document types`);
    assertAllowed(metadata.jurisdictions, vocabulary.jurisdictions, `${metadata.ruleId} jurisdictions`);
    assertAllowed(metadata.documentTypes, vocabulary.documentTypes, `${metadata.ruleId} document types`);
    unique(metadata.jurisdictions, `${metadata.ruleId} jurisdictions`);
    unique(metadata.documentTypes, `${metadata.ruleId} document types`);
    assertArray(metadata.affectedTerms, `${metadata.ruleId} affected terms`);
    if (metadata.affectedTerms.length === 0) fail(`${metadata.ruleId}: affected terms must not be empty`);
    for (const term of metadata.affectedTerms) assertNonEmptyString(term, `${metadata.ruleId} affected term`);
    assertUri(metadata.officialRuleUrl, `${metadata.ruleId} officialRuleUrl`);
    const officialRuleUrl = new URL(metadata.officialRuleUrl);
    if (
      officialRuleUrl.protocol !== "https:"
      || officialRuleUrl.hostname !== "docs.peppol.eu"
      || !officialRuleUrl.pathname.startsWith("/poac/aunz/2025-Q4/pint-aunz/")
      || !officialRuleUrl.pathname.endsWith(`/rule/${metadata.ruleId}/`)
      || !/\/trn-(?:invoice|creditnote)\/rule\//.test(officialRuleUrl.pathname)
    ) {
      fail(`${metadata.ruleId}: officialRuleUrl must identify that rule on an authoritative OpenPeppol transaction page`);
    }
    assertExactKeys(metadata.example, ["fixtureId", "patches"], [], `${metadata.ruleId} example`);
    assertNonEmptyString(metadata.example.fixtureId, `${metadata.ruleId} example fixtureId`);
    assertArray(metadata.example.patches, `${metadata.ruleId} example patches`);
    if (metadata.example.patches.length === 0) fail(`${metadata.ruleId}: example patches must not be empty`);
    for (const [index, patch] of metadata.example.patches.entries()) {
      assertExactKeys(patch, ["find", "replace"], [], `${metadata.ruleId} patch ${index}`);
      assertNonEmptyString(patch.find, `${metadata.ruleId} patch ${index} find`);
      if (typeof patch.replace !== "string") fail(`${metadata.ruleId} patch ${index} replace must be a string`);
    }
    interpretationsById.set(metadata.ruleId, interpretation);
  }
  if (interpretations.length < 15 || interpretations.length > 25) {
    fail(`launch tranche must contain 15–25 Project Interpretations, found ${interpretations.length}`);
  }

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
    const interpretation = interpretationsById.get(official.id);
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
        state: interpretation ? interpretation.metadata.editorialState : review.guidanceState,
      },
    };
    if (interpretation) {
      if (evidence.status !== "invalid-covered") fail(`${official.id}: interpretation is not fixture-backed`);
      if (!evidence.fixtures.includes(interpretation.metadata.example.fixtureId)) {
        fail(`${official.id}: example fixture is absent from reviewed coverage`);
      }
      if (
        JSON.stringify(interpretation.metadata.jurisdictions) !== JSON.stringify(editorial.jurisdictions)
        || JSON.stringify(interpretation.metadata.documentTypes) !== JSON.stringify(editorial.documentTypes)
      ) fail(`${official.id}: interpretation applicability differs from editorial review`);
      rule.guidance = {
        title: interpretation.title,
        summary: interpretation.summary,
        commonCauses: interpretation.commonCauses,
        fix: interpretation.fix,
        affectedTerms: [...interpretation.metadata.affectedTerms],
        officialRuleUrl: interpretation.metadata.officialRuleUrl,
        failingExample: {
          fixtureId: interpretation.metadata.example.fixtureId,
          xml: interpretation.failingXml,
        },
        correctedExample: {
          xml: interpretation.correctedXml,
        },
      };
    }
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
      resources: packageJson.pintAnz.rulesetResources,
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

export function buildGapReport(root = repoRoot) {
  const snapshot = buildSnapshot(root);
  const manifest = readJson(join(root, "packages/fixtures/manifest.json"));
  const fixtureById = new Map(manifest.fixtures.map((fixture) => [fixture.id, fixture]));
  const launch = snapshot.rules.filter((rule) => rule.guidance !== undefined);
  const count = (values) => Object.fromEntries(
    [...new Set(values)].sort().map((value) => [value, values.filter((candidate) => candidate === value).length]),
  );
  const fixtureEvidence = launch.flatMap((rule) => rule.coverage.fixtureIds.map((id) => fixtureById.get(id)));
  return {
    _generated: {
      notice: "Generated by packages/rules/scripts/build-snapshot.mjs; do not edit by hand.",
      schemaVersion: 1,
    },
    rulesetVersion: snapshot.provenance.rulesetVersion,
    launch: {
      targetRange: { minimum: 15, maximum: 25 },
      selectedCount: launch.length,
      selectedRuleIds: launch.map((rule) => rule.official.id),
      rulesets: count(launch.map((rule) => rule.official.ruleset)),
      primaryTopics: count(launch.map((rule) => rule.editorial.primaryTopic)),
      applicability: {
        jurisdictions: [...new Set(launch.flatMap((rule) => rule.applicability.jurisdictions))].sort(),
        documentTypes: [...new Set(launch.flatMap((rule) => rule.applicability.documentTypes))].sort(),
      },
      fixtureEvidence: {
        jurisdictions: count(fixtureEvidence.map((fixture) => fixture.jurisdiction)),
        documentTypes: count(fixtureEvidence.map((fixture) => fixture.documentType)),
      },
    },
    remaining: {
      fixtureBackedWithoutInterpretation: snapshot.rules
        .filter((rule) => rule.coverage.status === "invalid-covered" && rule.guidance === undefined)
        .map((rule) => rule.official.id),
      blockedWithoutFixture: snapshot.rules
        .filter((rule) => rule.coverage.status === "blocked")
        .map((rule) => rule.official.id),
      notApplicable: snapshot.rules
        .filter((rule) => rule.coverage.status === "not-applicable")
        .map((rule) => rule.official.id),
    },
  };
}

export function serializedGapReport(root = repoRoot) {
  return `${JSON.stringify(buildGapReport(root), null, 2)}\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const expected = serializedSnapshot();
  const expectedGapReport = serializedGapReport();
  if (process.argv.includes("--check")) {
    const actual = readFileSync(outputPath, "utf8");
    if (actual !== expected) fail("generated snapshot is stale; run pnpm --filter @pint-anz/rules generate");
    const actualGapReport = readFileSync(gapReportPath, "utf8");
    if (actualGapReport !== expectedGapReport) fail("generated interpretation gap report is stale; run pnpm --filter @pint-anz/rules generate");
    console.log("Rule snapshot and interpretation gap report are current.");
  } else {
    writeFileSync(outputPath, expected);
    writeFileSync(gapReportPath, expectedGapReport);
    console.log("Generated 245 rights-safe rule records and the interpretation gap report.");
  }
}
