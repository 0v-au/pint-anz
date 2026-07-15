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
import { beforeAll, describe, expect, it } from "vitest";
import { manifest, fixtureUrl } from "@pint-anz/fixtures";
import checkedInInventory from "../rule-inventory.json" with { type: "json" };
import { verifyPinnedFiles } from "../src/artefacts.js";
import { buildInventory } from "../src/inventory.js";
import { validateDocument } from "../src/validate.js";

beforeAll(() => {
  verifyPinnedFiles();
});

describe("artefact and inventory drift", () => {
  it("rule-inventory.json matches the pinned Schematron sources", () => {
    expect(buildInventory()).toEqual(checkedInInventory);
  });

  it("manifest pins the same ruleset version as the lock file", () => {
    const lock = verifyPinnedFiles();
    expect(manifest.ruleset.version).toBe(lock.rulesetVersion);
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
