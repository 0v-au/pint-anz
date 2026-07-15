import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { fixtureUrl } from "@pint-anz/fixtures";
import { validateDocument, validateFile } from "../src/index.js";
import type { ValidationResult } from "../src/index.js";

const execFileAsync = promisify(execFile);
const rulesetDirectory = fileURLToPath(new URL("../../../artefacts/", import.meta.url));

describe("lint vertical slice", () => {
  it("accepts a valid Australian invoice after the full pipeline", async () => {
    const validation = await validateFile(fileURLToPath(fixtureUrl("invoice-au-standard")), {
      rulesetDirectory,
    });

    expect(validation).toMatchObject({
      complete: true,
      valid: true,
      documentType: "invoice",
      rulesetVersion: "1.1.2",
      diagnostics: [],
    });
  });

  it("preserves the official rule ID for an invalid invoice", async () => {
    const validation = await validateFile(
      fileURLToPath(fixtureUrl("aligned-ibr-001-aunz-wrong-scheme")),
      { rulesetDirectory },
    );

    expect(validation.complete).toBe(true);
    expect(validation.valid).toBe(false);
    expect(validation.diagnostics.map((item) => item.ruleId)).toContain("aligned-ibr-001-aunz");
  });

  it("validates a credit note through the same complete pipeline", async () => {
    const validation = await validateFile(fileURLToPath(fixtureUrl("credit-note-au-standard")), {
      rulesetDirectory,
    });

    expect(validation).toMatchObject({ complete: true, valid: true, documentType: "credit-note" });
  });

  it("validates in-memory content without exposing its temporary file", async () => {
    const xml = await readFile(fileURLToPath(fixtureUrl("invoice-nz-standard")), "utf8");
    const validation = await validateDocument(xml, {
      documentName: "received invoice.xml",
      rulesetDirectory,
    });

    expect(validation).toMatchObject({
      complete: true,
      valid: true,
      document: "received invoice.xml",
      documentType: "invoice",
    });
  });

  it("does not report a partial result as document invalid when ruleset files are absent", async () => {
    const validation = await validateFile(fileURLToPath(fixtureUrl("invoice-au-standard")), {
      rulesetDirectory: "/directory/that/does/not/exist",
    });

    expect(validation).toMatchObject({ complete: false, valid: false });
    expect(validation.diagnostics).toEqual([
      expect.objectContaining({ stage: "tool", ruleId: null }),
    ]);
  });

  it("rejects DOCTYPE before parsing or schema validation", async () => {
    const validation = await validateFile(fileURLToPath(fixtureUrl("invoice-doctype-entity")), {
      rulesetDirectory,
    });

    expect(validation).toMatchObject({ complete: false, valid: false });
    expect(validation.diagnostics[0]).toMatchObject({ stage: "preflight" });
  });

  it("reports an XSD failure as a completed document validation", async () => {
    const validation = await validateFile(fileURLToPath(fixtureUrl("credit-note-missing-id")), {
      rulesetDirectory,
    });

    expect(validation).toMatchObject({ complete: true, valid: false, documentType: "credit-note" });
    expect(validation.diagnostics[0]).toMatchObject({ stage: "schema", ruleId: null });
  });

  it("reports malformed XML as a completed document failure rather than a tool failure", async () => {
    const validation = await validateFile(fileURLToPath(fixtureUrl("invoice-truncated")), {
      rulesetDirectory,
    });

    expect(validation).toMatchObject({ complete: true, valid: false, documentType: "invoice" });
    expect(validation.diagnostics[0]).toMatchObject({ stage: "schema", ruleId: null });
  });

  it("supports paths containing spaces", async () => {
    const directory = await mkdtemp(join(tmpdir(), "pint anz lint "));
    const path = join(directory, "invoice with spaces.xml");
    try {
      await cp(fileURLToPath(fixtureUrl("invoice-au-standard")), path);
      await expect(validateFile(path, { rulesetDirectory })).resolves.toMatchObject({ valid: true });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("returns JSON and exit code 1 from the built CLI", async () => {
    const cli = fileURLToPath(new URL("../bin/cli.js", import.meta.url));
    const invalid = fileURLToPath(fixtureUrl("aligned-ibr-001-aunz-wrong-scheme"));

    try {
      await execFileAsync(process.execPath, [
        cli,
        invalid,
        "--ruleset-dir",
        rulesetDirectory,
        "--format",
        "json",
      ]);
      throw new Error("CLI unexpectedly accepted an invalid invoice");
    } catch (error) {
      const failure = error as Error & { code?: number; stdout?: string };
      expect(failure.code).toBe(1);
      expect(JSON.parse(failure.stdout ?? "{}")).toMatchObject({
        complete: true,
        valid: false,
        rulesetVersion: "1.1.2",
        results: [
          expect.objectContaining({
            complete: true,
            valid: false,
            diagnostics: expect.arrayContaining([
              expect.objectContaining({
                severity: "error",
                ruleId: "aligned-ibr-001-aunz",
                document: invalid,
                rulesetVersion: "1.1.2",
                stage: "business-rule",
              }),
            ]),
          }),
        ],
      });
    }
  });

  it("expands quoted globs and combines deterministic multi-file JSON", async () => {
    const cli = fileURLToPath(new URL("../bin/cli.js", import.meta.url));
    const cwd = fileURLToPath(new URL("../../..", import.meta.url));
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        cli,
        "packages/fixtures/valid/*-standard.xml",
        "--ruleset-dir",
        rulesetDirectory,
        "--format",
        "json",
      ],
      { cwd },
    );
    const output = JSON.parse(stdout) as { valid: boolean; complete: boolean; results: ValidationResult[] };
    expect(output).toMatchObject({ valid: true, complete: true });
    expect(output.results).toHaveLength(4);
    expect(output.results.map((item) => item.document)).toEqual(
      [...output.results.map((item) => item.document)].sort((a, b) => a.localeCompare(b, "en")),
    );
  });
});
