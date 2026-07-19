/**
 * Runs every corpus fixture through the real official pipeline:
 * preflight -> UBL 2.1 XSD -> both official Schematron transforms.
 *
 * - valid fixtures must reach the rules stage with zero failed asserts
 * - invalid fixtures must fail exactly their declared rules and no others
 * - schema-invalid fixtures must fail XSD while staying well-formed
 * - malformed fixtures must fail before schema validation
 * - rejected fixtures must be stopped by the receiver preflight
 */
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { manifest, fixtureUrl } from "@pint-anz/fixtures";
import checkedInInventory from "../rule-inventory.json" with { type: "json" };
import { sha256, verifyPinnedFiles } from "../src/artefacts.js";
import { buildInventory, buildRuleProjection } from "../src/inventory.js";
import { validateDocument } from "../src/validate.js";

beforeAll(() => {
  verifyPinnedFiles();
});

describe("artefact and inventory drift", () => {
  it("the rights-safe rule projection matches the pinned Schematron sources", () => {
    const inventory = buildInventory();
    expect(buildRuleProjection(inventory)).toEqual(checkedInInventory);
    expect(checkedInInventory.rules).toHaveLength(245);
    for (const rule of checkedInInventory.rules) {
      expect(Object.keys(rule).sort()).toEqual(["family", "id", "kind", "ruleset", "severity"]);
    }
  });

  it("manifest pins the same ruleset version as the lock file", () => {
    const lock = verifyPinnedFiles();
    expect(manifest.ruleset.version).toBe(lock.rulesetVersion);
  });

  it("rejects missing and checksum-drifted pinned files", () => {
    const baseDir = mkdtempSync(join(tmpdir(), "pint-anz-pins-"));
    writeFileSync(join(baseDir, "drifted.sch"), "different");
    const lock = { files: {
      "missing.sch": sha256(Buffer.from("missing")),
      "drifted.sch": sha256(Buffer.from("expected")),
    } };
    expect(() => verifyPinnedFiles({ lock, baseDir })).toThrow(/missing\.sch: missing[\s\S]*drifted\.sch: expected .* got/);
  });

  it("rejects missing and checksum-drifted retained download archives", () => {
    const baseDir = mkdtempSync(join(tmpdir(), "pint-anz-downloads-"));
    writeFileSync(join(baseDir, "drifted.zip"), "different");
    const lock = {
      downloads: [
        { name: "missing.zip", sha256: sha256(Buffer.from("missing")) },
        { name: "drifted.zip", sha256: sha256(Buffer.from("expected")) },
      ],
      files: {},
    };
    expect(() => verifyPinnedFiles({ lock, baseDir })).toThrow(/missing\.zip: missing retained download archive[\s\S]*drifted\.zip: expected .* got/);
  });
});

describe("corpus conformance", () => {
  for (const fixture of manifest.fixtures) {
    it(
      `${fixture.id} (${fixture.expectation})`,
      { timeout: 60_000 },
      async () => {
        const result = await validateDocument(fileURLToPath(fixtureUrl(fixture.id)));

        switch (fixture.expectation) {
          case "valid":
            expect(result.stage, result.rejectionReasons.join("; ") + result.xsdErrors.join("; ")).toBe("rules");
            expect(result.fired, "valid fixtures must fire no rules").toEqual([]);
            break;
          case "invalid":
            expect(result.stage, result.rejectionReasons.join("; ") + result.xsdErrors.join("; ")).toBe("rules");
            expect(result.firedIds, "must fail exactly the declared rules and no others").toEqual(
              [...fixture.expectedRules].sort(),
            );
            break;
          case "schema-invalid":
            expect(result.stage).toBe("schema-invalid");
            expect(result.xsdErrors.length).toBeGreaterThan(0);
            break;
          case "malformed":
            expect(["malformed", "rejected"]).toContain(result.stage);
            break;
          case "rejected":
            expect(result.stage).toBe("rejected");
            expect(result.rejectionReasons.length).toBeGreaterThan(0);
            break;
          default:
            throw new Error(`Unknown expectation: ${fixture.expectation}`);
        }
      },
    );
  }
});
