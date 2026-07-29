import { execFile } from "node:child_process";
import { appendFile, cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  inspectInstalledRule,
  parseSchematronRules,
  type OfficialRuleSource,
} from "../src/rule-inspection.js";
import { installRuleset } from "../src/rulesets.js";
import { RULESET_DIGEST, RULESET_VERSION } from "../src/types.js";

const execFileAsync = promisify(execFile);
const cli = fileURLToPath(new URL("../bin/cli.js", import.meta.url));
const artefactsDirectory = fileURLToPath(new URL("../../../artefacts/", import.meta.url));
const knownRuleId = "aligned-ibr-001-aunz";
const knownRuleSource =
  "resources/trn-invoice/schematron/PINT-jurisdiction-aligned-rules.sch";

describe("local Official Rule inspection", () => {
  let cacheDirectory: string;
  let rulesetDirectory: string;

  beforeAll(async () => {
    cacheDirectory = await mkdtemp(join(tmpdir(), "pint-anz-rule-inspection-"));
    const installed = await installRuleset({
      cacheDirectory,
      resourcesArchive: join(artefactsDirectory, "resources.zip"),
      ublArchive: join(artefactsDirectory, "UBL-2.1.zip"),
      offline: true,
    });
    rulesetDirectory = installed.directory;
  }, 30_000);

  afterAll(async () => {
    await rm(cacheDirectory, { recursive: true, force: true });
  });

  it("parses synthetic Schematron without a stored official-content fixture", () => {
    const source: OfficialRuleSource = {
      resourcesUrl: "https://example.test/synthetic.zip",
      path: "synthetic/rules.sch",
      sha256: "synthetic-file-digest",
    };
    const synthetic = Buffer.from(`
      <schema>
        <pattern>
          <rule context="cac:Synthetic">
            <assert id="synthetic-rule" flag="warning" test="cbc:ID">
              [synthetic-rule]-Synthetic diagnostic message.
            </assert>
          </rule>
        </pattern>
      </schema>
    `);

    expect(parseSchematronRules(synthetic, source)).toEqual([
      {
        id: "synthetic-rule",
        severity: "warning",
        message: "[synthetic-rule]-Synthetic diagnostic message.",
        context: "cac:Synthetic",
        test: "cbc:ID",
        rulesetVersion: RULESET_VERSION,
        rulesetDigest: RULESET_DIGEST,
        source,
        copyrightNotice: expect.stringContaining("Copyrighted OpenPeppol content"),
      },
    ]);
  });

  it("reads a known rule only after verifying the installed local artefact", async () => {
    const inspected = await inspectInstalledRule(knownRuleId, { cacheDirectory });

    expect(inspected).toMatchObject({
      id: knownRuleId,
      rulesetVersion: RULESET_VERSION,
      rulesetDigest: RULESET_DIGEST,
      source: {
        resourcesUrl: expect.stringContaining("docs.peppol.eu"),
        path: expect.stringMatching(/\.sch$/),
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    });
    expect(inspected?.severity).not.toHaveLength(0);
    expect(inspected?.message).not.toHaveLength(0);
    expect(inspected?.context).not.toHaveLength(0);
    expect(inspected?.test).not.toHaveLength(0);
  });

  it("emits matching human and JSON views from the built CLI", async () => {
    const inspected = await inspectInstalledRule(knownRuleId, { rulesetDirectory });
    expect(inspected).toBeDefined();

    const human = await execFileAsync(process.execPath, [
      cli,
      "ruleset",
      "show",
      knownRuleId,
      "--cache-dir",
      cacheDirectory,
    ]);
    expect(human.stdout).toContain(inspected?.message);
    expect(human.stdout).toContain(`Context: ${inspected?.context}`);
    expect(human.stdout).toContain(`Test: ${inspected?.test}`);
    expect(human.stdout).toContain("Copyright:");

    const json = await execFileAsync(process.execPath, [
      cli,
      "ruleset",
      "show",
      knownRuleId,
      "--cache-dir",
      cacheDirectory,
      "--json",
    ]);
    expect(JSON.parse(json.stdout)).toEqual(inspected);
  });

  it("uses stable exits for Unknown Rules and unavailable rulesets", async () => {
    await expect(
      execFileAsync(process.execPath, [
        cli,
        "ruleset",
        "show",
        "synthetic-unknown-rule",
        "--cache-dir",
        cacheDirectory,
      ]),
    ).rejects.toMatchObject({ code: 1 });

    await expect(
      execFileAsync(process.execPath, [
        cli,
        "ruleset",
        "show",
        knownRuleId,
        "--ruleset-dir",
        "/directory/that/does/not/exist",
      ]),
    ).rejects.toMatchObject({ code: 2 });
  });

  it("uses exit 2 when installed official source bytes drift", async () => {
    const driftRoot = await mkdtemp(join(tmpdir(), "pint-anz-rule-drift-"));
    const driftedRuleset = join(driftRoot, RULESET_VERSION);
    try {
      await cp(rulesetDirectory, driftedRuleset, { recursive: true });
      await appendFile(join(driftedRuleset, knownRuleSource), "\n<!-- test drift -->\n");

      await expect(
        execFileAsync(process.execPath, [
          cli,
          "ruleset",
          "show",
          knownRuleId,
          "--ruleset-dir",
          driftedRuleset,
        ]),
      ).rejects.toMatchObject({ code: 2 });
    } finally {
      await rm(driftRoot, { recursive: true, force: true });
    }
  });

  it("preserves existing ruleset command parsing and rejects invalid show arguments", async () => {
    const verified = await execFileAsync(process.execPath, [
      cli,
      "ruleset",
      "verify",
      RULESET_VERSION,
      "--cache-dir",
      cacheDirectory,
    ]);
    expect(verified.stdout).toContain(`Verified PINT A-NZ ${RULESET_VERSION}`);

    await expect(
      execFileAsync(process.execPath, [cli, "ruleset", "show", "--json"]),
    ).rejects.toMatchObject({ code: 2 });
  });
});
