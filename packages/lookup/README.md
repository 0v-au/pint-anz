# `@pint-anz/lookup`

Discover whether a Peppol Participant Identifier is currently published and
which standard PINT A-NZ billing documents it advertises. The package provides a
typed library and the `pint-anz-lookup` CLI.

A `capable` result means that matching service metadata was advertised when the
lookup ran. It does not prove that the organisation exists in a government
register, that an invoice is valid, that an endpoint is operational, or that a
document will be accepted or paid.

## Connectivity

Live lookup requires outbound DNS and HTTPS. It does not require a Peppol Access
Point, AS4 connection, Peppol membership, participant registration, or the
ability to send documents.

The default provider performs the sender-side discovery flow directly:

1. construct the SML DNS name for the Participant Identifier;
2. resolve its `Meta:SMP` U-NAPTR record;
3. retrieve the participant's SMP `ServiceGroup` over HTTPS;
4. retrieve only relevant PINT A-NZ `SignedServiceMetadata` resources.

No Peppol Directory or general business register is searched.

## CLI

Pass exactly one input form:

```bash
pint-anz-lookup --abn "$ABN"
pint-anz-lookup --nzbn "$NZBN" --capability credit-note
pint-anz-lookup \
  --participant 'iso6523-actorid-upis::<scheme>:<value>' \
  --format json
```

ABN and NZBN format/checksum validation is local. Leading zeroes are preserved.
An explicit participant using scheme `0151` or `0088` receives the same local
checksum validation.

Exit codes are stable:

| Code | Result |
|---:|---|
| `0` | `capable` |
| `1` | `participant-found-capability-absent` or `not-found` |
| `2` | `invalid-input` |
| `3` | `temporarily-unavailable` |
| `4` | `indeterminate`, CLI usage error, or unexpected internal failure |

Human and JSON output contain the same result state. JSON is the complete typed
`LookupResult`; human output is a concise rendering of it.

## Library

```ts
import { lookup } from "@pint-anz/lookup";

const result = await lookup(
  { kind: "abn", value: process.env.COUNTERPARTY_ABN ?? "" },
  { capability: "invoice" },
);

if (result.state === "capable") {
  console.log(result.capabilities);
} else {
  console.warn(result.state, result.evidence.warnings);
}
```

Providers and caches are injectable. Deterministic tests should supply a
`DiscoveryProvider`; they must not depend on production DNS or SMP servers.

```ts
import { lookup, type DiscoveryProvider } from "@pint-anz/lookup";

const provider: DiscoveryProvider = {
  name: "fixture-provider",
  async discover() {
    return {
      state: "not-found",
      provider: "fixture-provider",
      source: "offline fixture",
      capabilities: [],
      advertisedDocuments: [],
      advertisedProcesses: [],
      warnings: [],
    };
  },
};

await lookup(
  { kind: "participant", value: "iso6523-actorid-upis::9999:offline-example" },
  { provider, cache: false },
);
```

## Result states

- `capable`: the requested document/process capability was advertised.
- `participant-found-capability-absent`: the participant was found, but the
  requested capability was not advertised.
- `not-found`: authoritative discovery did not locate that Participant
  Identifier. This says nothing about whether the business exists.
- `temporarily-unavailable`: DNS, timeout, throttling, or retryable server failure
  prevented a conclusive result. It is never reported as `not-found`.
- `invalid-input`: local parsing or checksum validation failed; no provider was
  called.
- `indeterminate`: metadata was malformed, unsafe, contradictory, untrusted, or
  an unexpected failure prevented a reliable interpretation.

Evidence includes the provider/source, normalised participant, all advertised
document identifiers, retrieved process identifiers, safe endpoint host and
transport-profile metadata, lookup time, cache status, signature status, pinned
mapping versions, and warnings. Endpoint credentials, paths, queries, fragments,
certificate bodies, and untrusted response bodies are not returned or logged.

## Capability and protocol versions

This release pins:

| Item | Version/value |
|---|---|
| PINT A-NZ Billing | `1.1.2` |
| eDEC code lists | `9.7` |
| Service Metadata Locator | `1.3.0` |
| Service Metadata Publisher | `1.4.0` |
| Policy for use of Identifiers | `4.4.0` |
| Participant schemes | ABN `0151`; NZBN/GLN `0088` |
| Document scheme | `peppol-doctype-wildcard` |
| Billing process | `cenbii-procid-ubl::urn:peppol:bis:billing` |

The mapped document values are the UBL 2.1 Invoice and CreditNote values with
customisation `urn:peppol:pint:billing-1@aunz-1`. Exact wildcard-scheme
registrations and valid trailing-star best-match registrations are recognised.
Generic PINT `billing-1*` registration can therefore cover an A-NZ
specialisation. Self-billing is a separate process and is not inferred or mapped
by this release.

Code lists are dynamic. A later package version must explicitly review and pin a
new release; this package never silently downloads or adopts new mappings.

## Security, privacy, caching, and acceptable use

- SML resolution hashes the lower-cased scheme-qualified participant value, but
  DNS resolvers can observe the resulting lookup name.
- The selected SMP receives the canonical Participant Identifier in the HTTPS
  request path and can observe the caller's IP address and User-Agent.
- HTTPS URLs must have no credentials, query, or fragment and must use port 443.
  HTTP redirects, loopback/private IP literals, localhost names, DTD/entity XML,
  oversized bodies, excessive references, mismatched identifiers, and more than
  one SMP XML redirect are rejected.
- DNS and HTTP are timed out and retried once by default. Responses are bounded
  to 1 MiB each and ServiceGroups to 100 references.
- SMP signature presence is required for relevant service metadata. Without an
  injected `MetadataVerifier`, the status is `not-verified` and the result warns
  that no cryptographic Peppol PKI trust decision was made. A caller-supplied
  verifier owns trust-anchor, expiry, and revocation policy. For an SMP XML
  redirect, it also receives the destination `CertificateUID` and must match it
  against the Subject Unique Identifier of the destination signing certificate.
- The default in-memory cache retains found results for 5 minutes and not-found
  results for 1 minute. Temporary, invalid, and indeterminate results are never
  cached. A cache hit retains the original observation time.
- Discovery endpoints are intended for transactional sender lookup. The sources
  reviewed below do not publish a general bulk-query quota. That absence is not
  permission to crawl: do single-participant lookups, identify the client, honour
  throttling and operator terms, and never bypass rate limits.

Direct discovery still relies on the configured DNS resolver and normal TLS/DNS
security. This package blocks unsafe literal destinations but does not implement
DNSSEC validation or eliminate DNS-rebinding risk. Run it with ordinary outbound
network controls when processing untrusted input.

## Relationship to the Docker playground

The planned `packages/playground` service described in `prompts/playground.md`
is the offline, Dockerised simulated counterparty endpoint for deterministic
submission outcomes. It is not an Access Point, SML, SMP, or participant on a
Peppol network, and a successful playground exchange does not prove Peppol
interoperability.

Lookup and playground therefore have separate protocol boundaries. Lookup's
default provider uses production SML/SMP discovery; deterministic tests never
invoke it unless the live smoke test is explicitly enabled. Tests or local tools
that need the playground must inject a `DiscoveryProvider` or explicit local
configuration and must not make the Docker endpoint appear production-discovered.

## Tests

All default tests are deterministic and offline:

```bash
pnpm --filter @pint-anz/lookup test
```

A live smoke lookup runs only when both variables are provided. The participant
must be deliberately supplied by the caller; no government-issued identifier is
embedded as a live test target.

```bash
PINT_ANZ_LIVE_LOOKUP=1 \
PINT_ANZ_LIVE_PARTICIPANT='iso6523-actorid-upis::<scheme>:<value>' \
pnpm --filter @pint-anz/lookup test
```

## Authoritative sources reviewed

Reviewed on 16 July 2026:

- [OpenPeppol eDelivery specifications](https://docs.peppol.eu/edelivery/)
- [SML 1.3.0 specification](https://docs.peppol.eu/edelivery/sml/Peppol-EDN-Service-Metadata-Locator-1.3.0-2025-02-06.pdf)
- [SMP 1.4.0 specification](https://docs.peppol.eu/edelivery/smp/Peppol-EDN-Service-Metadata-Publishing-1.4.0-2025-02-06.pdf)
- [Policy for use of Identifiers 4.4.0](https://docs.peppol.eu/edelivery/policies/Peppol-EDN-Policy-for-use-of-identifiers-4.4.0-2025-02-06.pdf)
- [eDEC code lists](https://docs.peppol.eu/edelivery/codelists/)
- [PINT Wildcard Migration Plan 1.0.1](https://docs.peppol.eu/edelivery/changelog/2025-07/PINT%20Wildcard%20Migration%20Plan%201.0.1%202025.07.14.pdf)
- [PINT A-NZ Billing BIS](https://docs.peppol.eu/poac/aunz/pint-aunz/bis/)
