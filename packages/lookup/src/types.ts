/** Package and specification versions recorded in lookup evidence. */
export const LOOKUP_VERSION = "0.1.0" as const;
export const PINT_ANZ_RULESET_VERSION = "1.1.2" as const;
export const EDEC_CODE_LIST_VERSION = "9.7" as const;
export const SML_SPEC_VERSION = "1.3.0" as const;
export const SMP_SPEC_VERSION = "1.4.0" as const;
export const IDENTIFIER_POLICY_VERSION = "4.4.0" as const;

/** Input forms accepted by the lookup library. */
export type ParticipantInput =
  | {
      /** Input type. @example "abn" */
      readonly kind: "abn";
      /** Raw ABN text. @example "47555222000" */
      readonly value: string;
    }
  | {
      /** Input type. @example "nzbn" */
      readonly kind: "nzbn";
      /** Raw NZBN text. @example "9429033821733" */
      readonly value: string;
    }
  | {
      /** Input type. @example "participant" */
      readonly kind: "participant";
      /** Full Peppol Participant Identifier. @example "iso6523-actorid-upis::0151:47555222000" */
      readonly value: string;
    };

/** A normalised Peppol Participant Identifier used for discovery. */
export interface ParticipantIdentifier {
  /** Input form that produced this identifier. */
  // @example "abn"
  readonly source: ParticipantInput["kind"];
  /** Peppol participant meta-scheme. */
  // @example "iso6523-actorid-upis"
  readonly metaScheme: "iso6523-actorid-upis";
  /** ISO 6523 ICD scheme identifying the value's issuing system. */
  // @example "0151"
  readonly scheme: string;
  /** Identifier value with leading zeroes preserved. */
  // @example "47555222000"
  readonly value: string;
  /** Scheme-qualified value used by SML and SMP. */
  // @example "0151:47555222000"
  readonly participantValue: string;
  /** Full canonical Peppol Participant Identifier. */
  // @example "iso6523-actorid-upis::0151:47555222000"
  readonly canonical: string;
}

/** Standard PINT A-NZ billing capability requested by a caller. */
export type CapabilityRequest = "invoice" | "credit-note";

/** Signature interpretation attached to retrieved SMP service metadata. */
export type SignatureStatus = "not-present" | "not-verified" | "verified" | "invalid";

/** Safely reportable endpoint metadata observed in an SMP response. */
export interface EndpointMetadata {
  /** Endpoint hostname only; credentials, path, query, and fragment are omitted. */
  // @example "ap.example.net"
  readonly endpointHost: string | null;
  /** Peppol transport profile advertised for the endpoint. */
  // @example "peppol-transport-as4-v2_0"
  readonly transportProfile: string | null;
  /** ISO 8601 activation instant when supplied by the SMP. */
  // @example "2026-01-01T00:00:00Z"
  readonly activationDate: string | null;
  /** ISO 8601 expiration instant when supplied by the SMP. */
  // @example "2027-01-01T00:00:00Z"
  readonly expirationDate: string | null;
}

/** A document and process combination advertised for a participant. */
export interface Capability {
  /** Toolkit capability category derived from the advertised document value. */
  // @example "invoice"
  readonly kind: CapabilityRequest;
  /** Document identifier scheme from SMP metadata. */
  // @example "peppol-doctype-wildcard"
  readonly documentScheme: string;
  /** Full advertised document identifier value. */
  // @example "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2::Invoice##urn:peppol:pint:billing-1@aunz-1::2.1"
  readonly documentValue: string;
  /** Process identifier scheme from SMP metadata. */
  // @example "cenbii-procid-ubl"
  readonly processScheme: string;
  /** Full advertised process identifier value. */
  // @example "urn:peppol:bis:billing"
  readonly processValue: string;
  /** Safe metadata for the endpoints serving this capability. */
  // @example [{"endpointHost":"ap.example.net","transportProfile":"peppol-transport-as4-v2_0","activationDate":null,"expirationDate":null}]
  readonly endpoints: readonly EndpointMetadata[];
  /** Interpretation of the metadata XML signature. */
  // @example "not-verified"
  readonly signatureStatus: SignatureStatus;
}

/** Provider-level outcomes before public result mapping and caching. */
export type DiscoveryObservationState =
  | "found"
  | "not-found"
  | "temporarily-unavailable"
  | "indeterminate";

/** Facts returned by an injectable Discovery Provider. */
export interface DiscoveryObservation {
  /** Provider-level outcome. */
  // @example "found"
  readonly state: DiscoveryObservationState;
  /** Stable provider identifier. */
  // @example "peppol-sml-smp"
  readonly provider: string;
  /** Human-readable source locator with participant-specific paths removed. */
  // @example "edelivery.tech.ec.europa.eu"
  readonly source: string;
  /** PINT A-NZ capabilities observed for the participant. */
  // @example []
  readonly capabilities: readonly Capability[];
  /** All advertised document identifiers, including unmapped values. */
  // @example ["peppol-doctype-wildcard::urn:oasis:names:specification:ubl:schema:xsd:Invoice-2::Invoice##urn:peppol:pint:billing-1@aunz-1::2.1"]
  readonly advertisedDocuments: readonly string[];
  /** All advertised process identifiers retrieved for mapped documents. */
  // @example ["cenbii-procid-ubl::urn:peppol:bis:billing"]
  readonly advertisedProcesses: readonly string[];
  /** Non-fatal interpretation and trust limitations. */
  // @example ["SMP signature present but not cryptographically verified."]
  readonly warnings: readonly string[];
}

/** Injectable discovery boundary used by deterministic tests and custom providers. */
export interface DiscoveryProvider {
  /** Stable provider name included in cache keys and evidence. */
  // @example "peppol-sml-smp"
  readonly name: string;
  /** Observe the participant's published capabilities without sending a document. */
  discover(participant: ParticipantIdentifier, signal?: AbortSignal): Promise<DiscoveryObservation>;
}

/** Public lookup result states with stable CLI semantics. */
export type LookupState =
  | "capable"
  | "participant-found-capability-absent"
  | "not-found"
  | "temporarily-unavailable"
  | "invalid-input"
  | "indeterminate";

/** Whether evidence came from a fresh provider call or cache entry. */
export type CacheStatus = "miss" | "hit";

/** Evidence supporting a Lookup Result without claiming delivery success. */
export interface LookupEvidence {
  /** Provider that produced the observation. */
  // @example "peppol-sml-smp"
  readonly provider: string;
  /** Provider source with participant-specific paths removed. */
  // @example "edelivery.tech.ec.europa.eu"
  readonly source: string;
  /** Normalised participant, or null when input was invalid. */
  // @example {"source":"abn","metaScheme":"iso6523-actorid-upis","scheme":"0151","value":"47555222000","participantValue":"0151:47555222000","canonical":"iso6523-actorid-upis::0151:47555222000"}
  readonly participant: ParticipantIdentifier | null;
  /** Advertised document identifiers observed during lookup. */
  // @example []
  readonly advertisedDocuments: readonly string[];
  /** Advertised process identifiers observed during lookup. */
  // @example []
  readonly advertisedProcesses: readonly string[];
  /** Safe endpoint metadata for mapped capabilities. */
  // @example []
  readonly endpoints: readonly EndpointMetadata[];
  /** Distinct signature states seen in retrieved service metadata. */
  // @example ["not-verified"]
  readonly signatureStatuses: readonly SignatureStatus[];
  /** ISO 8601 instant at which the original provider observation occurred. */
  // @example "2026-07-16T01:02:03.000Z"
  readonly lookupTime: string;
  /** Whether this response was freshly observed or cached. */
  // @example "miss"
  readonly cacheStatus: CacheStatus;
  /** Pinned PINT A-NZ ruleset version used for capability mapping. */
  // @example "1.1.2"
  readonly pintAnzRulesetVersion: typeof PINT_ANZ_RULESET_VERSION;
  /** Pinned eDEC code-list version used for capability identifiers. */
  // @example "9.7"
  readonly edecCodeListVersion: typeof EDEC_CODE_LIST_VERSION;
  /** Non-fatal limitations and interpretation warnings. */
  // @example ["Discovery does not prove end-to-end delivery readiness."]
  readonly warnings: readonly string[];
}

/** Stable library and CLI response for one participant capability request. */
export interface LookupResult {
  /** Exact outcome; failures never collapse into not-found. */
  // @example "capable"
  readonly state: LookupState;
  /** Capability assessed by this lookup. */
  // @example "invoice"
  readonly requestedCapability: CapabilityRequest;
  /** Capabilities advertised and recognised by the pinned catalogue. */
  // @example []
  readonly capabilities: readonly Capability[];
  /** Evidence supporting the outcome. */
  // @example {"provider":"peppol-sml-smp","source":"edelivery.tech.ec.europa.eu","participant":null,"advertisedDocuments":[],"advertisedProcesses":[],"endpoints":[],"signatureStatuses":[],"lookupTime":"2026-07-16T01:02:03.000Z","cacheStatus":"miss","pintAnzRulesetVersion":"1.1.2","edecCodeListVersion":"9.7","warnings":[]}
  readonly evidence: LookupEvidence;
}

/** Cache entry stored by an injected Lookup Cache. */
export interface LookupCacheEntry {
  /** Fresh result captured before cache status is rewritten to hit. */
  // @example {"state":"not-found","requestedCapability":"invoice","capabilities":[],"evidence":{}}
  readonly result: LookupResult;
  /** Epoch milliseconds after which this entry must not be returned. */
  // @example 1784163783000
  readonly expiresAt: number;
}

/** Cache boundary for per-process or caller-supplied persistent caching. */
export interface LookupCache {
  /** Return a non-expired entry for the exact key. */
  get(key: string, now: number): LookupCacheEntry | undefined;
  /** Store or replace an entry. */
  set(key: string, entry: LookupCacheEntry): void;
}

/** Optional verifier for SMP SignedServiceMetadata XML. */
export interface MetadataVerifier {
  /**
   * Verify signature integrity and trust according to caller policy.
   * When following an SMP XML redirect, `expectedCertificateUid` is the
   * destination certificate Subject Unique Identifier asserted by the
   * redirecting SMP and must also be checked.
   */
  verify(
    xml: string,
    sourceUrl: string,
    expectedCertificateUid?: string,
  ): Promise<"verified" | "invalid">;
}

/** Library options controlling provider, cache, time, and requested capability. */
export interface LookupOptions {
  /** Requested standard billing document capability; defaults to invoice. */
  // @example "invoice"
  readonly capability?: CapabilityRequest;
  /** Injected provider; defaults to direct Peppol SML/SMP discovery. */
  // @example "custom-provider"
  readonly provider?: DiscoveryProvider;
  /** Injected cache, or false to disable caching. */
  // @example false
  readonly cache?: LookupCache | false;
  /** Positive/found cache lifetime in milliseconds. */
  // @example 300000
  readonly positiveTtlMs?: number;
  /** Participant-not-found cache lifetime in milliseconds. */
  // @example 60000
  readonly negativeTtlMs?: number;
  /** Injectable clock returning epoch milliseconds. */
  // @example 1784163723000
  readonly now?: () => number;
  /** Optional cancellation signal for DNS and HTTP discovery. */
  // @example "AbortSignal"
  readonly signal?: AbortSignal;
}
