import { describe, expect, it, vi } from "vitest";

import { InMemoryLookupCache } from "../src/cache.js";
import { lookup } from "../src/lookup.js";
import type {
  Capability,
  DiscoveryObservation,
  DiscoveryObservationState,
  DiscoveryProvider,
  EndpointMetadata,
  LookupState,
  ParticipantInput,
} from "../src/types.js";

const LOOKUP_TIME = Date.parse("2026-07-16T01:02:03.000Z");
const PARTICIPANT_INPUT: ParticipantInput = {
  kind: "participant",
  value: "iso6523-actorid-upis::9999:specification-example",
};
const ENDPOINT: EndpointMetadata = {
  endpointHost: "ap.example.net",
  transportProfile: "peppol-transport-as4-v2_0",
  activationDate: null,
  expirationDate: null,
};

function capability(kind: Capability["kind"], overrides: Partial<Capability> = {}): Capability {
  return {
    kind,
    documentScheme: "peppol-doctype-wildcard",
    documentValue: `urn:example:${kind}`,
    processScheme: "cenbii-procid-ubl",
    processValue: "urn:peppol:bis:billing",
    endpoints: [ENDPOINT],
    signatureStatus: "not-verified",
    ...overrides,
  };
}

function observation(
  state: DiscoveryObservationState,
  capabilities: readonly Capability[] = [],
): DiscoveryObservation {
  return {
    state,
    provider: "deterministic-test-provider",
    source: "test.invalid",
    capabilities,
    advertisedDocuments: capabilities.map(
      ({ documentScheme, documentValue }) => `${documentScheme}::${documentValue}`,
    ),
    advertisedProcesses: capabilities.map(
      ({ processScheme, processValue }) => `${processScheme}::${processValue}`,
    ),
    warnings: ["Provider warning."],
  };
}

function providerFor(value: DiscoveryObservation): DiscoveryProvider {
  return {
    name: "deterministic-test-provider",
    discover: vi.fn().mockResolvedValue(value),
  };
}

describe("lookup orchestration", () => {
  it("AC-03: preserves provider outcome semantics", async () => {
    const cases: ReadonlyArray<{
      readonly observation: DiscoveryObservation;
      readonly expected: LookupState;
      readonly capability?: "invoice" | "credit-note";
    }> = [
      {
        observation: observation("found", [capability("invoice")]),
        expected: "capable",
      },
      {
        observation: observation("found", [capability("invoice")]),
        capability: "credit-note",
        expected: "participant-found-capability-absent",
      },
      { observation: observation("not-found"), expected: "not-found" },
      {
        observation: observation("temporarily-unavailable"),
        expected: "temporarily-unavailable",
      },
      { observation: observation("indeterminate"), expected: "indeterminate" },
    ];

    for (const testCase of cases) {
      const result = await lookup(PARTICIPANT_INPUT, {
        provider: providerFor(testCase.observation),
        capability: testCase.capability,
        cache: false,
        now: () => LOOKUP_TIME,
      });
      expect(result.state).toBe(testCase.expected);
      expect(result.evidence).toMatchObject({
        provider: "deterministic-test-provider",
        source: "test.invalid",
        participant: {
          canonical: PARTICIPANT_INPUT.value,
        },
        lookupTime: "2026-07-16T01:02:03.000Z",
        cacheStatus: "miss",
        pintAnzRulesetVersion: "1.1.2",
        edecCodeListVersion: "9.7",
      });
      expect(result.evidence.warnings).toContain(
        "Discovery does not prove end-to-end delivery readiness.",
      );
    }
  });

  it("AC-05: returns inspectable evidence", async () => {
    const duplicateEndpoint = { ...ENDPOINT };
    const result = await lookup(PARTICIPANT_INPUT, {
      provider: providerFor(
        observation("found", [
          capability("invoice", { endpoints: [ENDPOINT, duplicateEndpoint] }),
          capability("credit-note", {
            endpoints: [duplicateEndpoint],
            signatureStatus: "verified",
          }),
          capability("credit-note", { signatureStatus: "verified" }),
        ]),
      ),
      cache: false,
      now: () => LOOKUP_TIME,
    });

    expect(result.capabilities).toHaveLength(3);
    expect(result.evidence).toEqual({
      provider: "deterministic-test-provider",
      source: "test.invalid",
      participant: {
        source: "participant",
        metaScheme: "iso6523-actorid-upis",
        scheme: "9999",
        value: "specification-example",
        participantValue: "9999:specification-example",
        canonical: "iso6523-actorid-upis::9999:specification-example",
      },
      advertisedDocuments: [
        "peppol-doctype-wildcard::urn:example:invoice",
        "peppol-doctype-wildcard::urn:example:credit-note",
        "peppol-doctype-wildcard::urn:example:credit-note",
      ],
      advertisedProcesses: [
        "cenbii-procid-ubl::urn:peppol:bis:billing",
        "cenbii-procid-ubl::urn:peppol:bis:billing",
        "cenbii-procid-ubl::urn:peppol:bis:billing",
      ],
      endpoints: [ENDPOINT],
      signatureStatuses: ["not-verified", "verified"],
      lookupTime: "2026-07-16T01:02:03.000Z",
      cacheStatus: "miss",
      pintAnzRulesetVersion: "1.1.2",
      edecCodeListVersion: "9.7",
      warnings: [
        "Provider warning.",
        "Discovery does not prove end-to-end delivery readiness.",
      ],
    });
  });

  it("rejects invalid input locally without constructing or calling a provider", async () => {
    const discover = vi.fn();
    const result = await lookup(
      { kind: "abn", value: "not-an-abn" },
      {
        provider: { name: "must-not-run", discover },
        now: () => LOOKUP_TIME,
      },
    );

    expect(discover).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      state: "invalid-input",
      requestedCapability: "invoice",
      capabilities: [],
      evidence: {
        provider: "local-validation",
        source: "local",
        participant: null,
        cacheStatus: "miss",
      },
    });
    expect(result.evidence.warnings).toEqual([
      "ABN must contain exactly 11 digits.",
      "Discovery does not prove end-to-end delivery readiness.",
    ]);
  });

  it("maps unexpected provider throws to indeterminate and never caches them", async () => {
    const discover = vi.fn().mockRejectedValue(new Error("sensitive provider detail"));
    const cache = new InMemoryLookupCache();
    const provider: DiscoveryProvider = { name: "throwing-provider", discover };

    const first = await lookup(PARTICIPANT_INPUT, {
      provider,
      cache,
      now: () => LOOKUP_TIME,
    });
    const second = await lookup(PARTICIPANT_INPUT, {
      provider,
      cache,
      now: () => LOOKUP_TIME + 1,
    });

    expect(first.state).toBe("indeterminate");
    expect(second.state).toBe("indeterminate");
    expect(discover).toHaveBeenCalledTimes(2);
    expect(first.evidence.warnings.join(" ")).not.toContain("sensitive provider detail");
  });

  it("integrates positive and negative cache TTLs and retains original lookup time", async () => {
    const cache = new InMemoryLookupCache();
    const positiveProvider = providerFor(observation("found", [capability("invoice")]));
    const negativeProvider = providerFor(observation("not-found"));

    const positiveMiss = await lookup(PARTICIPANT_INPUT, {
      provider: positiveProvider,
      cache,
      positiveTtlMs: 100,
      now: () => LOOKUP_TIME,
    });
    const positiveHit = await lookup(PARTICIPANT_INPUT, {
      provider: positiveProvider,
      cache,
      positiveTtlMs: 100,
      now: () => LOOKUP_TIME + 99,
    });
    const positiveExpired = await lookup(PARTICIPANT_INPUT, {
      provider: positiveProvider,
      cache,
      positiveTtlMs: 100,
      now: () => LOOKUP_TIME + 100,
    });

    expect(positiveMiss.evidence.cacheStatus).toBe("miss");
    expect(positiveHit.evidence.cacheStatus).toBe("hit");
    expect(positiveHit.evidence.lookupTime).toBe(positiveMiss.evidence.lookupTime);
    expect(positiveExpired.evidence.cacheStatus).toBe("miss");
    expect(positiveProvider.discover).toHaveBeenCalledTimes(2);

    await lookup(PARTICIPANT_INPUT, {
      provider: negativeProvider,
      capability: "credit-note",
      cache,
      negativeTtlMs: 10,
      now: () => LOOKUP_TIME,
    });
    const negativeHit = await lookup(PARTICIPANT_INPUT, {
      provider: negativeProvider,
      capability: "credit-note",
      cache,
      negativeTtlMs: 10,
      now: () => LOOKUP_TIME + 9,
    });
    await lookup(PARTICIPANT_INPUT, {
      provider: negativeProvider,
      capability: "credit-note",
      cache,
      negativeTtlMs: 10,
      now: () => LOOKUP_TIME + 10,
    });

    expect(negativeHit.evidence.cacheStatus).toBe("hit");
    expect(negativeProvider.discover).toHaveBeenCalledTimes(2);
  });
});
