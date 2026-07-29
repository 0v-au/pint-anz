import { fileURLToPath } from "node:url";
import { fixtureUrl, manifest } from "@pint-anz/fixtures";
import { describe, expect, it } from "vitest";
import { validateFile } from "../src/index.js";

const rulesetDirectory = fileURLToPath(new URL("../../../artefacts/", import.meta.url));

describe("public API fixture contract", () => {
  it("matches every completed conformance-suite expectation", async () => {
    for (const fixture of manifest.fixtures) {
      const validation = await validateFile(fileURLToPath(fixtureUrl(fixture.id)), {
        rulesetDirectory,
      });
      const ruleIds = [...new Set(validation.diagnostics.flatMap((item) => item.ruleId ?? []))].sort();
      for (const diagnostic of validation.diagnostics) {
        if (diagnostic.stage === "business-rule" && diagnostic.ruleId) {
          expect(diagnostic.remediationUrl, fixture.id).toBe(
            `https://pint-anz.0v.com.au/rules/1.1.2/${diagnostic.ruleId}`,
          );
        }
      }

      if (fixture.expectation === "valid") {
        expect(validation, fixture.id).toMatchObject({ complete: true, valid: true });
      } else if (fixture.expectation === "invalid") {
        expect(validation, fixture.id).toMatchObject({ complete: true, valid: false });
        expect(ruleIds, fixture.id).toEqual([...fixture.expectedRules].sort());
      } else if (fixture.expectation === "rejected") {
        expect(validation, fixture.id).toMatchObject({ complete: false, valid: false });
        expect(validation.diagnostics[0]?.stage, fixture.id).toBe("preflight");
      } else {
        expect(validation, fixture.id).toMatchObject({ complete: true, valid: false });
        expect(validation.diagnostics[0]?.stage, fixture.id).toBe("schema");
      }
    }
  }, 60_000);
});
