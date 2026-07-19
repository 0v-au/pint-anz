/**
 * Merges one or more batch reports (see AUTHORING.md) into
 * packages/fixtures/manifest.json and packages/conformance/coverage.json.
 *
 * Deterministic: fixtures are keyed by id (later reports win), sorted by path;
 * coverage entries are replaced per rule, with fixture lists unioned when the
 * incoming status matches the existing one.
 */
import { readFileSync, writeFileSync } from "node:fs";

const manifestPath = new URL("../../fixtures/manifest.json", import.meta.url);
const coveragePath = new URL("../coverage.json", import.meta.url);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const coverage = JSON.parse(readFileSync(coveragePath, "utf8"));

const reports = process.argv.slice(2);
if (reports.length === 0) {
  console.error("usage: merge-batch.mjs <report.json...>");
  process.exit(2);
}

const fixturesById = new Map(manifest.fixtures.map((fixture) => [fixture.id, fixture]));
let added = 0;
let coverageUpdates = 0;

for (const reportPath of reports) {
  const report = JSON.parse(readFileSync(reportPath, "utf8"));

  for (const fixture of report.fixtures ?? []) {
    for (const key of ["id", "path", "documentType", "jurisdiction", "expectation", "rulesetVersion", "description"]) {
      if (!fixture[key]) throw new Error(`${reportPath}: fixture ${fixture.id ?? "?"} missing ${key}`);
    }
    if (!Array.isArray(fixture.expectedRules)) {
      throw new Error(`${reportPath}: fixture ${fixture.id} missing expectedRules array`);
    }
    if (!fixturesById.has(fixture.id)) added += 1;
    fixturesById.set(fixture.id, fixture);
  }

  for (const [ruleId, entry] of Object.entries(report.coverage ?? {})) {
    if (!(ruleId in coverage.rules)) throw new Error(`${reportPath}: unknown rule ${ruleId}`);
    if (!(entry.status in coverage.statuses)) {
      throw new Error(`${reportPath}: ${ruleId} has unknown status ${entry.status}`);
    }
    const existing = coverage.rules[ruleId];
    const fixtures =
      existing.status === entry.status
        ? [...new Set([...existing.fixtures, ...(entry.fixtures ?? [])])].sort()
        : [...new Set(entry.fixtures ?? [])].sort();
    coverage.rules[ruleId] = {
      status: entry.status,
      fixtures,
      observation: entry.observation ?? "",
    };
    coverageUpdates += 1;
  }
}

manifest.fixtures = [...fixturesById.values()].sort((a, b) => a.path.localeCompare(b.path));
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(coveragePath, `${JSON.stringify(coverage, null, 2)}\n`);
console.log(
  `merged ${reports.length} report(s): ${added} new fixtures (${manifest.fixtures.length} total), ${coverageUpdates} coverage updates`,
);
