/**
 * Release gate for the fixtures package (TODO.md section 6).
 * Exit code 0 only when:
 *   - pinned official artefacts verify and reproduce the rights-safe projection
 *   - coverage identities and version match that projection
 *   - every rule in the inventory has a reviewed coverage status
 *   - every invalid-covered rule has at least one single-rule negative fixture
 *   - COVERAGE.md is up to date with coverage.json
 *
 * The behavioural checks (valid fixtures pass, invalid fixtures fail exactly
 * their declared rule, malformed/rejected enforced) run in `pnpm test`.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildInventory, buildRuleProjection } from "../src/inventory.js";

const digestPattern = /^[a-f0-9]{64}$/;
const allowedCoverageStatuses = new Set([
  "invalid-covered",
  "valid-covered",
  "not-applicable",
  "blocked",
  "unreviewed",
]);

export function releaseProblems({ coverage, projection, rebuiltProjection, reportIsStale = false }) {
  const entries = Object.entries(coverage.rules ?? {});
  const problems = [];
  if (JSON.stringify(projection) !== JSON.stringify(rebuiltProjection)) {
    problems.push("rights-safe rule projection differs from the checksum-verified official artefacts; run `pnpm --filter @pint-anz/conformance inventory`");
  }
  if (!projection.resourcesUrl || !digestPattern.test(projection.resourcesSha256 ?? "")) {
    problems.push("rights-safe rule projection has incomplete resources provenance");
  }
  for (const ruleset of ["pint", "aligned"]) {
    const source = projection.sources?.[ruleset];
    if (!source?.path || !digestPattern.test(source.sha256 ?? "")) {
      problems.push(`rights-safe rule projection has incomplete ${ruleset} source provenance`);
    }
  }
  const projectedIds = (projection.rules ?? []).map((rule) => rule.id).sort();
  if (JSON.stringify(Object.keys(coverage.rules ?? {}).sort()) !== JSON.stringify(projectedIds)) {
    problems.push("coverage rule identities differ from the rights-safe rule projection");
  }
  if (coverage.rulesetVersion !== projection.rulesetVersion) {
    problems.push("coverage ruleset version differs from the rights-safe rule projection");
  }

  const declaredStatuses = Object.keys(coverage.statuses ?? {});
  if (
    declaredStatuses.length !== allowedCoverageStatuses.size ||
    declaredStatuses.some((status) => !allowedCoverageStatuses.has(status))
  ) {
    problems.push("coverage status definitions differ from the allowed state model");
  }
  const unreviewed = [];
  for (const [id, entry] of entries) {
    if (!allowedCoverageStatuses.has(entry.status)) problems.push(`${id}: unknown coverage status ${entry.status}`);
    if (entry.status === "unreviewed") unreviewed.push(id);
    if (!Array.isArray(entry.fixtures)) problems.push(`${id}: fixtures must be an array`);
    if (entry.status === "invalid-covered" && entry.fixtures?.length === 0) {
      problems.push(`${id}: invalid-covered without a fixture`);
    }
    if (["valid-covered", "not-applicable", "blocked"].includes(entry.status) && !entry.observation) {
      problems.push(`${id}: ${entry.status} without an independent observation`);
    }
  }
  if (unreviewed.length > 0) {
    problems.push(`${unreviewed.length} rules unreviewed: ${unreviewed.slice(0, 10).join(", ")}${unreviewed.length > 10 ? ", …" : ""}`);
  }
  if (reportIsStale) problems.push("COVERAGE.md is stale; run `pnpm --filter @pint-anz/conformance report` and commit it");
  return problems;
}

export function runReleaseGate({ build = buildInventory } = {}) {
  const coverage = JSON.parse(readFileSync(new URL("../coverage.json", import.meta.url), "utf8"));
  const projection = JSON.parse(readFileSync(new URL("../rule-inventory.json", import.meta.url), "utf8"));
  const rebuiltProjection = buildRuleProjection(build());
  const before = readFileSync(new URL("../COVERAGE.md", import.meta.url), "utf8");
  execFileSync("node", [fileURLToPath(new URL("./report-coverage.mjs", import.meta.url))], { stdio: "ignore" });
  const after = readFileSync(new URL("../COVERAGE.md", import.meta.url), "utf8");
  const problems = releaseProblems({ coverage, projection, rebuiltProjection, reportIsStale: before !== after });

  const totals = {};
  for (const entry of Object.values(coverage.rules)) totals[entry.status] = (totals[entry.status] ?? 0) + 1;
  console.log(`Release gate: ${Object.keys(coverage.rules).length} rules —`, totals);
  if (problems.length > 0) throw new Error(`RELEASE GATE FAILED:\n- ${problems.join("\n- ")}`);
  console.log("Release gate passed.");
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    runReleaseGate();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
