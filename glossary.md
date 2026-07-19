# Glossary
> Project: PINT A-NZ Toolkit
> Last updated: 2026-07-20
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

## Implementer
**Definition**: A developer or integration engineer creating, validating, or troubleshooting PINT A-NZ billing documents.
**Code identifier**: `Implementer`
**Layer**: UI
**Aliases to avoid**: end user, accountant, taxpayer
**Notes**: The rules site is written primarily for implementers arriving from diagnostics or search.

## Official Rule
**Definition**: A version-specific assertion published in the pinned PINT A-NZ ruleset.
**Code identifier**: `OfficialRule`
**Layer**: Domain
**Aliases to avoid**: supported rule, implemented rule
**Notes**: The catalogue includes every Official Rule, regardless of fixture coverage.

## Rule Catalogue Entry
**Definition**: The versioned record for an Official Rule, including rights-safe identity, authoritative source, applicability, and reviewed coverage status.
**Code identifier**: `RuleCatalogueEntry`
**Layer**: Domain
**Aliases to avoid**: rule explanation, rule page
**Notes**: Every Official Rule has an entry even when no Project Interpretation exists.

## Fixture-backed Rule
**Definition**: An Official Rule demonstrated by at least one reviewed fixture in the project corpus.
**Code identifier**: `FixtureBackedRule`
**Layer**: Domain
**Aliases to avoid**: covered rule
**Notes**: Fixture coverage and editorial coverage are separate facts.

## Rule Coverage
**Definition**: The reviewed relationship between an Official Rule and the fixture corpus, including rules that cannot be isolated or do not apply to PINT A-NZ documents.
**Code identifier**: `RuleCoverage`
**Layer**: Domain
**Aliases to avoid**: documentation status, implementation status
**Notes**: Conformance evidence is the source of truth for Rule Coverage.

## Project Interpretation
**Definition**: An independently authored explanation of an Official Rule grounded in observed validator and fixture behaviour.
**Code identifier**: `ProjectInterpretation`
**Layer**: Domain
**Aliases to avoid**: official guidance, official summary, paraphrase
**Notes**: It is project commentary, not a substitute for the copyrighted specification.

## Unknown Rule
**Definition**: A rule identifier absent from the pinned official rule inventory.
**Code identifier**: `UnknownRule`
**Layer**: Domain
**Aliases to avoid**: undocumented rule
**Notes**: An Unknown Rule is distinct from an Official Rule whose Project Interpretation is pending.
