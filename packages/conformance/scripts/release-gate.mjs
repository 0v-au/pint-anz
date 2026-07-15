/**
 * Release gate for the fixtures package (TODO.md section 6).
 * Exit code 0 only when:
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

const coverage = JSON.parse(readFileSync(new URL("../coverage.json", import.meta.url), "utf8"));
const entries = Object.entries(coverage.rules);
const problems = [];

const unreviewed = entries.filter(([, entry]) => entry.status === "unreviewed").map(([id]) => id);
if (unreviewed.length > 0) {
  problems.push(`${unreviewed.length} rules unreviewed: ${unreviewed.slice(0, 10).join(", ")}${unreviewed.length > 10 ? ", …" : ""}`);
}

for (const [id, entry] of entries) {
  if (entry.status === "invalid-covered" && entry.fixtures.length === 0) {
    problems.push(`${id}: invalid-covered without a fixture`);
  }
}

const before = readFileSync(new URL("../COVERAGE.md", import.meta.url), "utf8");
execFileSync("node", [fileURLToPath(new URL("./report-coverage.mjs", import.meta.url))], { stdio: "ignore" });
const after = readFileSync(new URL("../COVERAGE.md", import.meta.url), "utf8");
if (before !== after) {
  problems.push("COVERAGE.md is stale; run `pnpm --filter @pint-anz/conformance report` and commit it");
}

const totals = {};
for (const [, entry] of entries) totals[entry.status] = (totals[entry.status] ?? 0) + 1;
console.log(`Release gate: ${entries.length} rules —`, totals);

if (problems.length > 0) {
  console.error(`\nRELEASE GATE FAILED:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("Release gate passed.");
