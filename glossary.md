# Glossary
> Project: PINT A-NZ Lookup
> Last updated: 2026-07-17
> Rule: all domain terms in code must match entries here exactly.

---

## Participant Identifier
**Definition**: A Peppol logical address consisting of a meta-scheme and a scheme-qualified participant value.
**Code identifier**: `ParticipantIdentifier`
**Layer**: Domain
**Aliases to avoid**: network ID, Peppol number
**Notes**: For ABN and NZBN input the meta-scheme is `iso6523-actorid-upis`.

## Discovery Provider
**Definition**: An injectable component that observes a participant and its advertised receiving capabilities.
**Code identifier**: `DiscoveryProvider`
**Layer**: Infrastructure
**Aliases to avoid**: lookup backend, registry adapter
**Notes**: The production implementation uses SML DNS and SMP HTTPS; tests use fakes.

## Discovery Observation
**Definition**: The provider-level facts observed before they are mapped to a public lookup result.
**Code identifier**: `DiscoveryObservation`
**Layer**: Application
**Aliases to avoid**: raw result, provider response
**Notes**: Transport failures remain distinct from participant absence.

## Capability
**Definition**: A document type and business process combination advertised for a participant by its SMP.
**Code identifier**: `Capability`
**Layer**: Domain
**Aliases to avoid**: readiness, support flag
**Notes**: Advertisement does not prove end-to-end delivery readiness.

## Capability Request
**Definition**: The PINT A-NZ document capability the caller wants to assess.
**Code identifier**: `CapabilityRequest`
**Layer**: Application
**Aliases to avoid**: document filter, readiness request
**Notes**: The initial package supports standard billing invoice and credit note requests.

## Lookup Result
**Definition**: The stable public outcome returned by the library and rendered by the CLI.
**Code identifier**: `LookupResult`
**Layer**: Application
**Aliases to avoid**: discovery result, readiness result
**Notes**: Includes evidence, warnings, cache status, and an exact result state.

## Evidence
**Definition**: Source, timing, identifiers, and safely reportable metadata supporting a lookup result.
**Code identifier**: `LookupEvidence`
**Layer**: Application
**Aliases to avoid**: proof, guarantee
**Notes**: Evidence records what was observed without asserting delivery success.

## Service Metadata Locator
**Definition**: Peppol's DNS-based mechanism for locating the SMP responsible for a Participant Identifier.
**Code identifier**: `ServiceMetadataLocator`
**Layer**: Infrastructure
**Aliases to avoid**: central registry, SML API
**Notes**: Abbreviated SML in documentation after first use.

## Service Metadata Publisher
**Definition**: A Peppol service publishing participants' document, process, and endpoint metadata over HTTPS.
**Code identifier**: `ServiceMetadataPublisher`
**Layer**: Infrastructure
**Aliases to avoid**: directory, participant register
**Notes**: Abbreviated SMP in documentation after first use.

## Cache Status
**Definition**: Whether a Lookup Result was newly observed or served from a cache entry.
**Code identifier**: `CacheStatus`
**Layer**: Application
**Aliases to avoid**: cache state
**Notes**: Negative entries have a shorter lifetime than positive entries.
