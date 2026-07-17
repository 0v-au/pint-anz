import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const normalisedReadme = readme.replace(/\s+/g, " ");
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { readonly pintAnz?: Readonly<Record<string, string>> };

describe("package documentation", () => {
  it("AC-09: documents operational constraints", () => {
    for (const required of [
      "does not require a Peppol Access Point",
      "does not prove",
      "outbound DNS and HTTPS",
      "temporarily-unavailable",
      "not-verified",
      "privacy",
      "acceptable use",
      "PINT A-NZ Billing | `1.1.2`",
      "eDEC code lists | `9.7`",
      "SML 1.3.0 specification",
      "SMP 1.4.0 specification",
      "Policy for use of Identifiers 4.4.0",
      "PINT Wildcard Migration Plan 1.0.1",
      "PINT_ANZ_LIVE_PARTICIPANT",
      "Dockerised simulated counterparty endpoint",
      "must inject a `DiscoveryProvider`",
    ]) {
      expect(normalisedReadme).toContain(required);
    }

    expect(packageJson.pintAnz).toMatchObject({
      rulesetVersion: "1.1.2",
      edecCodeListVersion: "9.7",
      smlVersion: "1.3.0",
      smpVersion: "1.4.0",
      identifierPolicyVersion: "4.4.0",
    });
  });
});
