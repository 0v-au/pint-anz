import type {
  CapabilityRequest,
  LookupCache,
  LookupCacheEntry,
  LookupResult,
  LookupState,
  ParticipantIdentifier,
} from "./types.js";

/** Default lifetime for results proving that a participant was found. */
export const DEFAULT_POSITIVE_TTL_MS = 5 * 60 * 1_000;

/** Default lifetime for participant-not-found results. */
export const DEFAULT_NEGATIVE_TTL_MS = 60 * 1_000;

/** Per-process Lookup Cache with expiry evaluated against caller-supplied time. */
export class InMemoryLookupCache implements LookupCache {
  private readonly entries = new Map<string, LookupCacheEntry>();

  /** Return an unexpired entry and evict an expired entry for the same key. */
  get(key: string, now: number): LookupCacheEntry | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return undefined;
    }

    if (now >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }

    return entry;
  }

  /** Store or replace an entry under an exact lookup key. */
  set(key: string, entry: LookupCacheEntry): void {
    this.entries.set(key, entry);
  }
}

/** Build a collision-safe cache key for a provider, participant, and request. */
export function buildLookupCacheKey(
  provider: string,
  participant: ParticipantIdentifier,
  requestedCapability: CapabilityRequest,
): string {
  return JSON.stringify([provider, participant.canonical, requestedCapability]);
}

/** Select the lifetime for a cacheable result state, or no lifetime for failures. */
export function cacheTtlForState(
  state: LookupState,
  positiveTtlMs = DEFAULT_POSITIVE_TTL_MS,
  negativeTtlMs = DEFAULT_NEGATIVE_TTL_MS,
): number | undefined {
  switch (state) {
    case "capable":
    case "participant-found-capability-absent":
      return validTtl(positiveTtlMs);
    case "not-found":
      return validTtl(negativeTtlMs);
    case "temporarily-unavailable":
    case "invalid-input":
    case "indeterminate":
      return undefined;
  }
}

/** Create an entry only when the Lookup Result is safe to cache. */
export function createLookupCacheEntry(
  result: LookupResult,
  now: number,
  positiveTtlMs = DEFAULT_POSITIVE_TTL_MS,
  negativeTtlMs = DEFAULT_NEGATIVE_TTL_MS,
): LookupCacheEntry | undefined {
  const ttlMs = cacheTtlForState(result.state, positiveTtlMs, negativeTtlMs);
  if (ttlMs === undefined || !Number.isFinite(now)) {
    return undefined;
  }

  const expiresAt = now + ttlMs;
  if (!Number.isSafeInteger(expiresAt)) {
    return undefined;
  }

  return { result, expiresAt };
}

/** Return a cache-hit view without mutating the result retained in the cache. */
export function asCacheHit(result: LookupResult): LookupResult {
  return {
    ...result,
    evidence: {
      ...result.evidence,
      cacheStatus: "hit",
    },
  };
}

function validTtl(ttlMs: number): number | undefined {
  return Number.isSafeInteger(ttlMs) && ttlMs > 0 ? ttlMs : undefined;
}
