import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  REMEDIATION_ORIGIN,
  RULESET_VERSION,
  ruleRemediationUrl,
} from "../src/index.js";

describe("diagnostic remediation URL contract", () => {
  it("uses the canonical versioned project route", () => {
    expect(REMEDIATION_ORIGIN).toBe("https://pint-anz.0v.com.au");
    expect(ruleRemediationUrl("ibr-004")).toBe(
      `https://pint-anz.0v.com.au/rules/${RULESET_VERSION}/ibr-004`,
    );
  });

  it("keeps an unexpected rule identifier inside one URL path segment", () => {
    expect(ruleRemediationUrl("synthetic/rule id")).toBe(
      `https://pint-anz.0v.com.au/rules/${RULESET_VERSION}/synthetic%2Frule%20id`,
    );
  });

  it("does not add a runtime dependency on the rules catalogue package", async () => {
    const packageJson = JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf8"),
    ) as { dependencies?: Record<string, string> };

    expect(packageJson.dependencies).not.toHaveProperty("@pint-anz/rules");
  });
});
