import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { releaseProblems, runReleaseGate } from "../scripts/release-gate.mjs";
import { extractedArchiveProblems, verifyLocalArtefacts } from "../scripts/verify-artefacts.mjs";

const coverage = JSON.parse(readFileSync(new URL("../coverage.json", import.meta.url), "utf8"));
const projection = JSON.parse(readFileSync(new URL("../rule-inventory.json", import.meta.url), "utf8"));

function problems(changes = {}) {
  return releaseProblems({
    coverage: structuredClone(changes.coverage ?? coverage),
    projection: structuredClone(changes.projection ?? projection),
    rebuiltProjection: structuredClone(changes.rebuiltProjection ?? projection),
    reportIsStale: changes.reportIsStale ?? false,
  });
}

describe("release gate failure paths", () => {
  it("accepts the current projection, evidence, and report", () => {
    expect(problems()).toEqual([]);
  });

  it("rejects projection and provenance drift", () => {
    const drifted = structuredClone(projection);
    drifted.resourcesSha256 = "not-a-digest";
    expect(problems({ projection: drifted })).toEqual(expect.arrayContaining([
      expect.stringContaining("projection differs"),
      expect.stringContaining("incomplete resources provenance"),
    ]));
  });

  it("rejects coverage identity and version drift", () => {
    const drifted = structuredClone(coverage);
    delete drifted.rules[projection.rules[0].id];
    drifted.rulesetVersion = "drifted";
    expect(problems({ coverage: drifted })).toEqual(expect.arrayContaining([
      expect.stringContaining("coverage rule identities differ"),
      expect.stringContaining("coverage ruleset version differs"),
    ]));
  });

  it("rejects unknown, unreviewed, and incomplete coverage states", () => {
    const drifted = structuredClone(coverage);
    const ids = Object.keys(drifted.rules);
    drifted.statuses.invented = "A silently broadened state must not pass.";
    drifted.rules[ids[0]].status = "invented";
    drifted.rules[ids[1]].status = "unreviewed";
    drifted.rules[ids[2]].fixtures = [];
    const blockedId = ids.find((id) => drifted.rules[id].status === "blocked");
    drifted.rules[blockedId].observation = "";
    expect(problems({ coverage: drifted })).toEqual(expect.arrayContaining([
      expect.stringContaining("status definitions differ"),
      expect.stringContaining("unknown coverage status invented"),
      expect.stringContaining("rules unreviewed"),
      expect.stringContaining("invalid-covered without a fixture"),
      expect.stringContaining("blocked without an independent observation"),
    ]));
  });

  it("rejects a stale generated report", () => {
    expect(problems({ reportIsStale: true })).toContainEqual(expect.stringContaining("COVERAGE.md is stale"));
  });

  it("keeps download explicit and wires verification into build, test, and release", () => {
    const root = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8"));
    const conformance = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(conformance.scripts.artefacts).toContain("fetch-artefacts.mjs");
    expect(conformance.scripts.build).toContain("verify-artefacts.mjs");
    expect(conformance.scripts.pretest).toContain("verify-artefacts.mjs");
    expect(conformance.scripts.build).not.toContain("fetch-artefacts.mjs");
    expect(conformance.scripts.pretest).not.toContain("fetch-artefacts.mjs");
    expect(root.scripts.build).toContain("@pint-anz/conformance gate");
    expect(conformance.scripts.gate).toContain("verify-artefacts.mjs");
    expect(conformance.scripts.gate).toContain("release-gate.mjs");
    expect(conformance.scripts.gate).toContain("check-published-rights.mjs --verify-fingerprints");
    expect(conformance.scripts.gate).not.toContain("--tracked");
  });

  it("propagates missing or drifted official artefacts through build and release entry points", () => {
    for (const message of ["pinned file missing", "pinned checksum drift"]) {
      const fail = () => { throw new Error(message); };
      expect(() => verifyLocalArtefacts({ verifyPinned: fail })).toThrow(message);
      expect(() => runReleaseGate({ build: fail })).toThrow(message);
    }
  });

  it("rejects missing or source-drifted compiled validators during build verification", () => {
    const compiled = {
      compiler: "xslt3@test",
      pint: { sourceSha256: "source", sefSha256: "sef" },
      aligned: { sourceSha256: "source", sefSha256: "sef" },
    };
    expect(() => verifyLocalArtefacts({
      verifyPinned: () => ({ compiled }),
      verifyExtracted: () => [],
      readText: () => JSON.stringify({ compiler: "wrong", pint: {}, aligned: {} }),
      digestFile: () => "source",
      digestSef: () => "modified",
      fileExists: () => false,
    })).toThrow(/wrong compiler identity[\s\S]*pint compiled validator is missing[\s\S]*pint compiled validator stamp differs[\s\S]*aligned compiled validator is missing/);
  });

  it("rejects a modified compiled SEF even when its stamp claims the pinned digest", () => {
    const compiled = {
      compiler: "xslt3@test",
      pint: { sourceSha256: "source", sefSha256: "sef" },
      aligned: { sourceSha256: "source", sefSha256: "sef" },
    };
    expect(() => verifyLocalArtefacts({
      verifyPinned: () => ({ compiled }),
      verifyExtracted: () => [],
      readText: () => JSON.stringify({ compiler: compiled.compiler, pint: compiled.pint, aligned: compiled.aligned }),
      digestFile: () => "source",
      digestSef: () => "modified",
      fileExists: () => true,
    })).toThrow(/compiled validator differs from the tracked digest/);
  });

  it("detects modified and missing extracted XSD archive members", () => {
    const archived = new Map([
      ["xsd/one.xsd", Buffer.from("one")],
      ["xsd/two.xsd", Buffer.from("two")],
    ]);
    const extracted = new Map([
      ["xsd/one.xsd", Buffer.from("modified")],
    ]);
    expect(extractedArchiveProblems({
      entries: [...archived.keys()],
      readArchiveEntry: (entry) => archived.get(entry),
      readExtractedFile: (entry) => {
        if (!extracted.has(entry)) throw new Error("missing");
        return extracted.get(entry);
      },
    })).toEqual([
      "xsd/one.xsd: extracted file differs from the checksum-verified archive",
      "xsd/two.xsd: extracted file is missing",
    ]);
  });
});
