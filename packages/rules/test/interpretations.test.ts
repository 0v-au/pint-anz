import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { extractedArchiveProblems, verifyLocalArtefacts } from "../../conformance/scripts/verify-artefacts.mjs";
import { validateDocument } from "../../conformance/src/validate.js";
import {
  applyExamplePatches,
  interpretationMetadataKeys,
  loadInterpretations,
  parseInterpretation,
} from "../scripts/interpretations.mjs";
import gapReport from "../content/interpretation-gaps.generated.json" with { type: "json" };
import metadataSchema from "../content/interpretation.schema.json" with { type: "json" };
import snapshot from "../src/rules.snapshot.json" with { type: "json" };

const repoRoot = resolve(import.meta.dirname, "../../..");
const packageRoot = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(repoRoot, "packages/fixtures/manifest.json"), "utf8"));
const records = loadInterpretations(packageRoot);
const temporaryRoot = mkdtempSync(join(tmpdir(), "pint-anz-interpretations-"));
const immutableReleaseRoot = "https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/";

afterAll(() => rmSync(temporaryRoot, { recursive: true, force: true }));
beforeAll(() => verifyLocalArtefacts());

function canonicalSnippet(value: string): string {
  return value.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
}

describe("reviewed Project Interpretations", () => {
  it("uses the published metadata schema for 15 versioned plain-Markdown records", () => {
    expect(metadataSchema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(records).toHaveLength(15);
    const allowedKeys = new Set(interpretationMetadataKeys);
    const requiredKeys = new Set(metadataSchema.required);
    for (const record of records) {
      const metadata = record.metadata as Record<string, unknown>;
      expect(Object.keys(metadata).every((key) => allowedKeys.has(key))).toBe(true);
      expect([...requiredKeys].every((key) => key in metadata)).toBe(true);
      expect(metadataSchema.properties.editorialState.enum).toContain(metadata.editorialState);
      expect(metadata.editorialState).toBe("reviewed");
      expect(metadata.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(metadata.rulesetVersion).toBe("1.1.2");
      const officialRuleUrl = new URL(String(metadata.officialRuleUrl));
      expect(officialRuleUrl.hostname).toBe("docs.peppol.eu");
      expect(String(metadata.officialRuleUrl)).toMatch(new RegExp(`^${immutableReleaseRoot}trn-(invoice|creditnote)/rule/${metadata.ruleId}/$`));
      expect(record.markdown).toContain("This Project Interpretation is independently authored");
      expect(record.markdown).toContain("copyrighted official wording and assertion");
      for (const patch of record.metadata.example.patches) {
        expect(canonicalSnippet(record.failingXml), `${record.metadata.ruleId} failing fragment`).toContain(canonicalSnippet(patch.find));
        if (patch.replace) {
          expect(canonicalSnippet(record.correctedXml), `${record.metadata.ruleId} corrected fragment`).toContain(canonicalSnippet(patch.replace));
        } else {
          expect(canonicalSnippet(record.correctedXml), `${record.metadata.ruleId} corrected fragment`).not.toContain(canonicalSnippet(patch.find));
        }
      }
    }
  });

  it("rejects impossible calendar dates through interpretation.schema.json", () => {
    const source = readFileSync(records[0].path, "utf8");
    const path = join(temporaryRoot, `${records[0].metadata.ruleId}.invalid-date.md`);
    writeFileSync(path, source.replace('"reviewedAt": "2026-07-27"', '"reviewedAt": "2026-02-30"'));
    expect(() => parseInterpretation(path)).toThrow(/metadata does not match interpretation\.schema\.json[\s\S]*must match format "date"/);
  });

  it("rejects modified XSD, compiled SEF, and validator source inputs", () => {
    const compiled = {
      compiler: "xslt3@test",
      pint: { sourceSha256: "source", sefSha256: "sef" },
      aligned: { sourceSha256: "source", sefSha256: "sef" },
    };
    const stamp = JSON.stringify({ compiler: compiled.compiler, pint: compiled.pint, aligned: compiled.aligned });
    const verified = {
      verifyPinned: () => ({ compiled }),
      readText: () => stamp,
      fileExists: () => true,
    };
    expect(() => verifyLocalArtefacts({
      verifyPinned: () => {
        throw new Error("Pinned artefact checksum drift: modified Schematron source");
      },
    })).toThrow(/modified Schematron source/);
    expect(extractedArchiveProblems({
      entries: ["xsd/maindoc/UBL-Invoice-2.1.xsd"],
      readArchiveEntry: () => Buffer.from("pinned XSD"),
      readExtractedFile: () => Buffer.from("modified XSD"),
    })).toEqual(["xsd/maindoc/UBL-Invoice-2.1.xsd: extracted file differs from the checksum-verified archive"]);
    expect(() => verifyLocalArtefacts({
      ...verified,
      verifyExtracted: () => ["xsd/maindoc/UBL-Invoice-2.1.xsd: extracted file differs from the checksum-verified archive"],
      digestFile: () => "source",
      digestSef: () => "sef",
    })).toThrow(/extracted file differs from the checksum-verified archive/);
    expect(() => verifyLocalArtefacts({
      ...verified,
      verifyExtracted: () => [],
      digestFile: () => "source",
      digestSef: () => "modified SEF",
    })).toThrow(/compiled validator differs from the tracked digest/);
    expect(() => verifyLocalArtefacts({
      ...verified,
      verifyExtracted: () => [],
      digestFile: () => "modified source",
      digestSef: () => "sef",
    })).toThrow(/compiled validator source differs from the tracked digest/);
  });

  it("balances rule sources, direct fixture evidence, applicability, and implementer topics", () => {
    expect(gapReport.launch.selectedCount).toBe(15);
    expect(gapReport.launch.rulesets).toEqual({ aligned: 7, pint: 8 });
    expect(Object.keys(gapReport.launch.primaryTopics).sort()).toEqual([
      "allowances-and-charges",
      "amounts-and-totals",
      "attachments",
      "codelists",
      "dates-and-periods",
      "identifiers",
      "invoice-lines",
      "parties-and-addresses",
      "payment",
      "references",
      "tax",
    ]);
    expect(gapReport.launch.applicability.jurisdictions).toEqual(["A-NZ", "AU", "NZ"]);
    expect(gapReport.launch.applicability.documentTypes).toEqual(["credit-note", "invoice"]);
    expect(gapReport.launch.fixtureEvidence.jurisdictions).toMatchObject({ AU: 14, NZ: 1 });
    expect(gapReport.launch.fixtureEvidence.documentTypes).toMatchObject({ "credit-note": 1, invoice: 14 });
    expect(gapReport.remaining.fixtureBackedWithoutInterpretation).toHaveLength(165);
    expect(gapReport.remaining.blockedWithoutFixture).toHaveLength(63);
    expect(gapReport.remaining.notApplicable).toHaveLength(2);
  });

  it("models draft authoring state while the release contains reviewed guidance only", () => {
    expect(metadataSchema.properties.editorialState.enum).toContain("draft");
    expect(snapshot.rules.filter((rule) => rule.editorial.state === "reviewed")).toHaveLength(15);
    expect(snapshot.rules.filter((rule) => rule.editorial.state === "reviewed").every((rule) => rule.guidance !== undefined)).toBe(true);
  });

  it("exercises every failing and corrected complete document against the pinned validator", async () => {
    const fixtureById = new Map(manifest.fixtures.map((fixture: { id: string }) => [fixture.id, fixture]));
    for (const record of records) {
      const fixture = fixtureById.get(record.metadata.example.fixtureId) as {
        path: string;
        expectedRules: string[];
        expectation: string;
        rulesetVersion: string;
      } | undefined;
      expect(fixture, record.metadata.ruleId).toBeDefined();
      expect(fixture?.expectation).toBe("invalid");
      expect(fixture?.rulesetVersion).toBe(record.metadata.rulesetVersion);
      expect(fixture?.expectedRules).toEqual([record.metadata.ruleId]);

      const failingPath = resolve(repoRoot, "packages/fixtures", fixture?.path ?? "");
      const failingSource = readFileSync(failingPath, "utf8");
      const correctedSource = applyExamplePatches(failingSource, record);
      expect(correctedSource).not.toBe(failingSource);
      const correctedPath = join(temporaryRoot, `${record.metadata.ruleId}.corrected.xml`);
      writeFileSync(correctedPath, correctedSource);

      const failingResult = await validateDocument(failingPath);
      expect(failingResult.stage, record.metadata.ruleId).toBe("rules");
      expect(failingResult.firedIds, record.metadata.ruleId).toEqual([record.metadata.ruleId]);

      const correctedResult = await validateDocument(correctedPath);
      expect(correctedResult.stage, record.metadata.ruleId).toBe("rules");
      expect(correctedResult.firedIds, record.metadata.ruleId).toEqual([]);
    }
  }, 120_000);
});
