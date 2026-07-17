import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { fixtureUrl } from "@pint-anz/fixtures";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const entry = fileURLToPath(new URL("../dist/index.cjs", import.meta.url));
const rulesetDirectory = fileURLToPath(new URL("../../../artefacts/", import.meta.url));

interface ActionRun {
  readonly code: number;
  readonly stdout: string;
  readonly outputs: Record<string, string>;
  readonly summary: string;
}

const workspaces: string[] = [];

async function createWorkspace(fixtures: Record<string, string>): Promise<string> {
  const workspace = await mkdtemp(join(tmpdir(), "pint anz lint action "));
  workspaces.push(workspace);
  await mkdir(join(workspace, "invoices"), { recursive: true });
  for (const [name, fixtureId] of Object.entries(fixtures)) {
    await cp(fileURLToPath(fixtureUrl(fixtureId)), join(workspace, "invoices", name));
  }
  return workspace;
}

async function runAction(
  workspace: string,
  inputs: Record<string, string>,
  environment: Record<string, string | undefined> = {},
): Promise<ActionRun> {
  const outputPath = join(workspace, "github-output.txt");
  const summaryPath = join(workspace, "github-summary.md");
  const env: Record<string, string | undefined> = {
    PATH: process.env.PATH,
    GITHUB_WORKSPACE: workspace,
    GITHUB_OUTPUT: outputPath,
    GITHUB_STEP_SUMMARY: summaryPath,
    "INPUT_RULESET-DIR": rulesetDirectory,
    ...environment,
  };
  for (const [name, value] of Object.entries(inputs)) {
    env[`INPUT_${name.toUpperCase()}`] = value;
  }
  let code = 0;
  let stdout = "";
  try {
    ({ stdout } = await execFileAsync(process.execPath, [entry], { env }));
  } catch (error) {
    const failure = error as Error & { code?: number; stdout?: string };
    code = failure.code ?? -1;
    stdout = failure.stdout ?? "";
  }
  const outputs: Record<string, string> = {};
  for (const line of (await readFile(outputPath, "utf8").catch(() => "")).split("\n")) {
    const separator = line.indexOf("=");
    if (separator > 0) outputs[line.slice(0, separator)] = line.slice(separator + 1);
  }
  const summary = await readFile(summaryPath, "utf8").catch(() => "");
  return { code, stdout, outputs, summary };
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("lint action entry point", () => {
  it("passes a valid invoice and reports outputs, log, and summary", async () => {
    const workspace = await createWorkspace({ "invoice.xml": "invoice-au-standard" });
    const run = await runAction(workspace, { files: "invoices/invoice.xml" });

    expect(run.code).toBe(0);
    expect(run.stdout).toContain("PASS invoices/invoice.xml (PINT A-NZ 1.1.2)");
    expect(run.outputs).toMatchObject({
      "checked-files": "1",
      "error-count": "0",
      "warning-count": "0",
      "ruleset-version": "1.1.2",
    });
    expect(run.summary).toContain("invoices/invoice.xml");
  });

  it("fails an invalid invoice with a file annotation carrying the rule ID", async () => {
    const workspace = await createWorkspace({ "bad invoice.xml": "aligned-ibr-001-aunz-wrong-scheme" });
    const run = await runAction(workspace, { files: "invoices/*.xml" });

    expect(run.code).toBe(1);
    expect(run.stdout).toContain("::error file=invoices/bad invoice.xml,");
    expect(run.stdout).toContain("rule aligned-ibr-001-aunz");
    expect(Number(run.outputs["error-count"])).toBeGreaterThanOrEqual(1);
  });

  it("fails malformed XML as an invalid document with a line-level annotation", async () => {
    const workspace = await createWorkspace({ "truncated.xml": "invoice-truncated" });
    const run = await runAction(workspace, { files: "invoices/truncated.xml" });

    expect(run.code).toBe(1);
    expect(run.stdout).toMatch(/::error file=invoices\/truncated\.xml,line=\d+/);
  });

  it("reports a preflight-rejected document as incomplete, not merely invalid", async () => {
    const workspace = await createWorkspace({ "doctype.xml": "invoice-doctype-entity" });
    const run = await runAction(workspace, { files: "invoices/doctype.xml" });

    expect(run.code).toBe(2);
    expect(run.stdout).toContain("could not be completely validated");
  });

  it("treats no matches as a configuration error by default and honours ignore", async () => {
    const workspace = await createWorkspace({});
    const strict = await runAction(workspace, { files: "nothing/**/*.xml" });
    expect(strict.code).toBe(2);
    expect(strict.stdout).toContain("::error");
    expect(strict.stdout).toContain("No files matched");
    expect(strict.outputs["checked-files"]).toBe("0");

    const relaxed = await runAction(workspace, {
      files: "nothing/**/*.xml",
      "if-no-files-found": "ignore",
    });
    expect(relaxed.code).toBe(0);
    expect(relaxed.outputs["checked-files"]).toBe("0");
  });

  it("does not let a matching glob hide another glob that matched nothing", async () => {
    const workspace = await createWorkspace({ "invoice.xml": "invoice-au-standard" });
    const strict = await runAction(workspace, { files: "invoices/*.xml\nmissing/*.xml" });
    expect(strict.code).toBe(2);
    expect(strict.stdout).toContain("No files matched: missing/*.xml");
    expect(strict.outputs["checked-files"]).toBe("0");

    const warned = await runAction(workspace, {
      files: "invoices/*.xml\nmissing/*.xml",
      "if-no-files-found": "warn",
    });
    expect(warned.code).toBe(0);
    expect(warned.stdout).toContain("::warning");
    expect(warned.outputs["checked-files"]).toBe("1");
  });

  it("validates multiple files from one glob and bounds annotations", async () => {
    const workspace = await createWorkspace({
      "a-valid.xml": "invoice-au-standard",
      "b-valid.xml": "invoice-nz-standard",
      "c-bad.xml": "aligned-ibr-001-aunz-wrong-scheme",
      "d-truncated.xml": "invoice-truncated",
    });
    const run = await runAction(workspace, { files: "invoices/*.xml", "max-annotations": "1" });

    expect(run.code).toBe(1);
    expect(run.outputs["checked-files"]).toBe("4");
    expect(run.stdout.match(/::error file=/g)).toHaveLength(1);
    expect(run.stdout).toMatch(/::notice::\d+ further diagnostics were not annotated/);
  });

  it("writes the full machine-readable report with the CLI envelope", async () => {
    const workspace = await createWorkspace({ "bad.xml": "aligned-ibr-001-aunz-wrong-scheme" });
    const run = await runAction(workspace, {
      files: "invoices/bad.xml",
      "report-file": "reports/pint.json",
    });

    expect(run.code).toBe(1);
    const report = JSON.parse(await readFile(join(workspace, "reports", "pint.json"), "utf8"));
    expect(report).toMatchObject({
      rulesetVersion: "1.1.2",
      complete: true,
      valid: false,
    });
    expect(report.rulesetDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(report.results).toHaveLength(1);
    expect(report.results[0].diagnostics[0]).toMatchObject({
      severity: "error",
      document: "invoices/bad.xml",
    });
  });

  it("emits the JSON report on stdout when format is json", async () => {
    const workspace = await createWorkspace({ "invoice.xml": "invoice-au-standard" });
    const run = await runAction(workspace, { files: "invoices/invoice.xml", format: "json" });

    expect(run.code).toBe(0);
    const line = run.stdout.split("\n").find((candidate) => candidate.startsWith("{"));
    expect(line).toBeDefined();
    expect(JSON.parse(line as string)).toMatchObject({ rulesetVersion: "1.1.2", valid: true });
  });

  it("reads hyphenated action inputs from the GitHub Actions environment", async () => {
    const workspace = await createWorkspace({
      "a.xml": "invoice-au-standard",
      "b.xml": "invoice-nz-standard",
      "c-bad.xml": "aligned-ibr-001-aunz-wrong-scheme",
    });
    const run = await runAction(workspace, { files: "invoices/*.xml" }, { INPUT_MAX_ANNOTATIONS: "1" });

    expect(run.code).toBe(1);
    expect(run.stdout).toContain("::error file=invoices/c-bad.xml");
    expect(run.stdout).not.toContain("The files input is required");
  });

  it("rejects patterns that could escape the workspace", async () => {
    const workspace = await createWorkspace({});
    for (const pattern of ["../outside/*.xml", "/etc/*.xml", "invoices/../../*.xml"]) {
      const run = await runAction(workspace, { files: pattern });
      expect(run.code).toBe(2);
      expect(run.stdout).toContain("must stay inside the workspace");
    }
  });

  it("rejects invalid configuration values without validating anything", async () => {
    const workspace = await createWorkspace({ "invoice.xml": "invoice-au-standard" });
    const invalidInputs: Record<string, string>[] = [
      { files: "invoices/*.xml", format: "sarif" },
      { files: "invoices/*.xml", "max-annotations": "many" },
      { files: "invoices/*.xml", "max-document-bytes": "-1" },
      { files: "invoices/*.xml", "if-no-files-found": "skip" },
      { files: "" },
    ];
    for (const inputs of invalidInputs) {
      const run = await runAction(workspace, inputs);
      expect(run.code).toBe(2);
      expect(run.stdout).toContain("::error");
      expect(run.outputs["checked-files"]).toBe("0");
    }
  });

  it("fails with a configuration error when the ruleset directory is not prepared", async () => {
    const workspace = await createWorkspace({ "invoice.xml": "invoice-au-standard" });
    const run = await runAction(workspace, {
      files: "invoices/invoice.xml",
      "ruleset-dir": "missing-ruleset",
    });

    expect(run.code).toBe(2);
    expect(run.stdout).toContain("ruleset-dir does not hold a verified PINT A-NZ");
  });

  it("requires GITHUB_WORKSPACE", async () => {
    const workspace = await createWorkspace({});
    const run = await runAction(workspace, { files: "invoices/*.xml" }, { GITHUB_WORKSPACE: undefined });

    expect(run.code).toBe(2);
    expect(run.stdout).toContain("GITHUB_WORKSPACE");
  });
});
