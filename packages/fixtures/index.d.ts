export type FixtureDocumentType = "invoice" | "credit-note" | "unknown";
export type FixtureJurisdiction = "AU" | "NZ" | "A-NZ";
export type FixtureExpectation = "valid" | "invalid" | "malformed";

export interface Fixture {
  readonly id: string;
  readonly path: string;
  readonly documentType: FixtureDocumentType;
  readonly jurisdiction: FixtureJurisdiction;
  readonly expectation: FixtureExpectation;
  readonly expectedRules: readonly string[];
  readonly rulesetVersion: string;
  readonly description: string;
}

export interface FixtureManifest {
  readonly schemaVersion: 1;
  readonly ruleset: {
    readonly name: "PINT A-NZ Billing";
    readonly version: string;
    readonly status: "active" | "upcoming" | "retired";
    readonly source: string;
    readonly resources: string;
  };
  readonly fixtures: readonly Fixture[];
}

export const manifest: FixtureManifest;
export function fixtureUrl(id: string): URL;
