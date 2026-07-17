import {
  InMemoryLookupCache,
  asCacheHit,
  buildLookupCacheKey,
  createLookupCacheEntry,
} from "./cache.js";
import { parseParticipantIdentifier } from "./identifiers.js";
import { createPeppolDiscoveryProvider } from "./peppol-provider.js";
import {
  EDEC_CODE_LIST_VERSION,
  PINT_ANZ_RULESET_VERSION,
  type Capability,
  type CapabilityRequest,
  type DiscoveryObservation,
  type DiscoveryProvider,
  type EndpointMetadata,
  type LookupEvidence,
  type LookupOptions,
  type LookupResult,
  type LookupState,
  type ParticipantIdentifier,
  type ParticipantInput,
  type SignatureStatus,
} from "./types.js";

const DEFAULT_CACHE = new InMemoryLookupCache();
const DELIVERY_READINESS_WARNING =
  "Discovery does not prove end-to-end delivery readiness.";

/** Validate input, observe the participant, and assess one PINT A-NZ capability. */
export async function lookup(
  input: ParticipantInput,
  options: LookupOptions = {},
): Promise<LookupResult> {
  const requestedCapability = options.capability ?? "invoice";
  const now = (options.now ?? Date.now)();
  const parsed = parseParticipantIdentifier(input);

  if (!parsed.ok) {
    return resultForInvalidInput(requestedCapability, now, parsed.message);
  }

  const provider = options.provider ?? createPeppolDiscoveryProvider();
  const cache = options.cache === false ? undefined : (options.cache ?? DEFAULT_CACHE);
  const cacheKey = buildLookupCacheKey(
    provider.name,
    parsed.participant,
    requestedCapability,
  );
  const cached = cache?.get(cacheKey, now);

  if (cached !== undefined) {
    return asCacheHit(cached.result);
  }

  let result: LookupResult;
  try {
    const observation = await provider.discover(parsed.participant, options.signal);
    result = resultForObservation(
      observation,
      parsed.participant,
      requestedCapability,
      now,
    );
  } catch {
    result = resultForUnexpectedFailure(
      provider,
      parsed.participant,
      requestedCapability,
      now,
    );
  }

  const entry = createLookupCacheEntry(
    result,
    now,
    options.positiveTtlMs,
    options.negativeTtlMs,
  );
  if (entry !== undefined) {
    cache?.set(cacheKey, entry);
  }

  return result;
}

function resultForObservation(
  observation: DiscoveryObservation,
  participant: ParticipantIdentifier,
  requestedCapability: CapabilityRequest,
  now: number,
): LookupResult {
  const state = lookupStateForObservation(observation, requestedCapability);

  return {
    state,
    requestedCapability,
    capabilities: observation.capabilities,
    evidence: evidence({
      provider: observation.provider,
      source: observation.source,
      participant,
      capabilities: observation.capabilities,
      advertisedDocuments: observation.advertisedDocuments,
      advertisedProcesses: observation.advertisedProcesses,
      lookupTime: now,
      warnings: observation.warnings,
    }),
  };
}

function lookupStateForObservation(
  observation: DiscoveryObservation,
  requestedCapability: CapabilityRequest,
): LookupState {
  switch (observation.state) {
    case "found":
      return observation.capabilities.some(
        (capability) => capability.kind === requestedCapability,
      )
        ? "capable"
        : "participant-found-capability-absent";
    case "not-found":
    case "temporarily-unavailable":
    case "indeterminate":
      return observation.state;
  }
}

function resultForInvalidInput(
  requestedCapability: CapabilityRequest,
  now: number,
  warning: string,
): LookupResult {
  return {
    state: "invalid-input",
    requestedCapability,
    capabilities: [],
    evidence: evidence({
      provider: "local-validation",
      source: "local",
      participant: null,
      capabilities: [],
      advertisedDocuments: [],
      advertisedProcesses: [],
      lookupTime: now,
      warnings: [warning],
    }),
  };
}

function resultForUnexpectedFailure(
  provider: DiscoveryProvider,
  participant: ParticipantIdentifier,
  requestedCapability: CapabilityRequest,
  now: number,
): LookupResult {
  return {
    state: "indeterminate",
    requestedCapability,
    capabilities: [],
    evidence: evidence({
      provider: provider.name,
      source: provider.name,
      participant,
      capabilities: [],
      advertisedDocuments: [],
      advertisedProcesses: [],
      lookupTime: now,
      warnings: ["Discovery Provider failed unexpectedly; outcome is indeterminate."],
    }),
  };
}

interface EvidenceInput {
  readonly provider: string;
  readonly source: string;
  readonly participant: ParticipantIdentifier | null;
  readonly capabilities: readonly Capability[];
  readonly advertisedDocuments: readonly string[];
  readonly advertisedProcesses: readonly string[];
  readonly lookupTime: number;
  readonly warnings: readonly string[];
}

function evidence(input: EvidenceInput): LookupEvidence {
  return {
    provider: input.provider,
    source: input.source,
    participant: input.participant,
    advertisedDocuments: input.advertisedDocuments,
    advertisedProcesses: input.advertisedProcesses,
    endpoints: distinctEndpoints(input.capabilities),
    signatureStatuses: distinctSignatureStatuses(input.capabilities),
    lookupTime: new Date(input.lookupTime).toISOString(),
    cacheStatus: "miss",
    pintAnzRulesetVersion: PINT_ANZ_RULESET_VERSION,
    edecCodeListVersion: EDEC_CODE_LIST_VERSION,
    warnings: distinct([...input.warnings, DELIVERY_READINESS_WARNING]),
  };
}

function distinctEndpoints(capabilities: readonly Capability[]): EndpointMetadata[] {
  const endpoints = capabilities.flatMap((capability) => capability.endpoints);
  const seen = new Set<string>();

  return endpoints.filter((endpoint) => {
    const key = JSON.stringify([
      endpoint.endpointHost,
      endpoint.transportProfile,
      endpoint.activationDate,
      endpoint.expirationDate,
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function distinctSignatureStatuses(
  capabilities: readonly Capability[],
): SignatureStatus[] {
  return distinct(capabilities.map((capability) => capability.signatureStatus));
}

function distinct<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
