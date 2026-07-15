import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { fixtureUrl } from "@pint-anz/fixtures";
import { validateFile } from "../src/index.js";

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
      });
    }
  });
});
