import { describe, expect, it } from "vitest";

import {
  InMemoryLookupCache,
  asCacheHit,
  buildLookupCacheKey,
  createLookupCacheEntry,
} from "../src/cache.js";
import type {
  CapabilityRequest,
  LookupResult,
  LookupState,
  ParticipantIdentifier,
} from "../src/types.js";

const LOOKUP_TIME = Date.parse("2026-07-16T01:02:03.000Z");

const participant: ParticipantIdentifier = {
  source: "participant",
  metaScheme: "iso6523-actorid-upis",
  scheme: "9999",
  value: "specification-example",
  participantValue: "9999:specification-example",
  canonical: "iso6523-actorid-upis::9999:specification-example",
};

function result(
  state: LookupState,
  requestedCapability: CapabilityRequest = "invoice",
): LookupResult {
  return {
    state,
    requestedCapability,
    capabilities: [],
    evidence: {
      provider: "deterministic-test-provider",
      source: "test.invalid",
      participant,
      advertisedDocuments: [],
      advertisedProcesses: [],
      endpoints: [],
      signatureStatuses: [],
      lookupTime: new Date(LOOKUP_TIME).toISOString(),
      cacheStatus: "miss",
      pintAnzRulesetVersion: "1.1.2",
      edecCodeListVersion: "9.7",
      warnings: [],
    },
  };
}

describe("Lookup Cache", () => {
  it("AC-06: applies conservative cache policy", () => {
    const cache = new InMemoryLookupCache();
    const positiveKey = buildLookupCacheKey("provider", participant, "invoice");
    const absentKey = buildLookupCacheKey("provider", participant, "credit-note");
    const negativeKey = buildLookupCacheKey("other-provider", participant, "invoice");
    const positive = createLookupCacheEntry(result("capable"), LOOKUP_TIME, 300, 50);
    const absent = createLookupCacheEntry(
      result("participant-found-capability-absent", "credit-note"),
      LOOKUP_TIME,
      300,
      50,
    );
    const negative = createLookupCacheEntry(result("not-found"), LOOKUP_TIME, 300, 50);

    expect(positive).toBeDefined();
    expect(absent).toBeDefined();
    expect(negative).toBeDefined();
    cache.set(positiveKey, positive!);
    cache.set(absentKey, absent!);
    cache.set(negativeKey, negative!);

    expect(cache.get(positiveKey, LOOKUP_TIME + 299)).toBe(positive);
    expect(cache.get(absentKey, LOOKUP_TIME + 299)).toBe(absent);
    expect(cache.get(negativeKey, LOOKUP_TIME + 49)).toBe(negative);
    expect(cache.get(negativeKey, LOOKUP_TIME + 50)).toBeUndefined();
    expect(cache.get(positiveKey, LOOKUP_TIME + 300)).toBeUndefined();
    expect(cache.get(absentKey, LOOKUP_TIME + 300)).toBeUndefined();

    for (const state of [
      "temporarily-unavailable",
      "invalid-input",
      "indeterminate",
    ] as const) {
      expect(createLookupCacheEntry(result(state), LOOKUP_TIME, 300, 50)).toBeUndefined();
    }
  });

  it("evicts an expired entry and permits a replacement", () => {
    const cache = new InMemoryLookupCache();
    const key = buildLookupCacheKey("provider", participant, "invoice");
    const expired = createLookupCacheEntry(result("capable"), LOOKUP_TIME, 1, 1)!;
    const replacement = createLookupCacheEntry(result("not-found"), LOOKUP_TIME + 2, 1, 10)!;

    cache.set(key, expired);
    expect(cache.get(key, LOOKUP_TIME + 1)).toBeUndefined();
    cache.set(key, replacement);
    expect(cache.get(key, LOOKUP_TIME + 2)).toBe(replacement);
  });

  it("returns a cache-hit view without changing the stored result", () => {
    const cachedResult = result("capable");
    const hit = asCacheHit(cachedResult);

    expect(hit).not.toBe(cachedResult);
    expect(hit.evidence).not.toBe(cachedResult.evidence);
    expect(hit.evidence.cacheStatus).toBe("hit");
    expect(cachedResult.evidence.cacheStatus).toBe("miss");
    expect(hit.evidence.lookupTime).toBe(cachedResult.evidence.lookupTime);
  });

  it("does not create entries for non-positive or unsafe lifetimes", () => {
    expect(createLookupCacheEntry(result("capable"), LOOKUP_TIME, 0, 50)).toBeUndefined();
    expect(createLookupCacheEntry(result("not-found"), LOOKUP_TIME, 300, -1)).toBeUndefined();
    expect(createLookupCacheEntry(result("capable"), Number.NaN, 300, 50)).toBeUndefined();
  });
});
