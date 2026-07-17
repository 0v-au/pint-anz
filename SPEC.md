# Spec: `@pint-anz/lookup`
> Started: 2026-07-16 · Completed: 2026-07-17 · Status: complete

## Goal

Build a typed Node.js library and CLI that validates ABN, NZBN, or explicit Peppol Participant Identifier input; performs read-only Peppol discovery; and reports whether the participant advertises the requested standard PINT A-NZ billing capability. Results must preserve uncertainty and return inspectable evidence without claiming that discovery proves business existence or end-to-end delivery readiness.

## Non-goals

- Send invoices, implement AS4, operate an Access Point, or test an endpoint by delivery.
- Search or scrape the Peppol Directory, ABR, NZBN Register, or general business registers.
- Implement PINT A-NZ self-billing capabilities in the initial release.
- Publish, register, modify, or delete Peppol metadata.
- Make live network tests part of the deterministic default test suite.
- Claim cryptographic trust when the caller has not supplied and applied a Peppol PKI verification policy.

## Acceptance criteria

- [x] **AC-01**: ABN, NZBN, and explicit Participant Identifier parsing preserves leading zeroes and rejects invalid format/checksum input locally → test: `test/identifiers.test.ts > "AC-01: validates and normalises participant input"`.
- [x] **AC-02**: Standard PINT A-NZ invoice and credit-note advertisements using the active wildcard document scheme and billing process map to typed capabilities → test: `test/capabilities.test.ts > "AC-02: maps PINT A-NZ billing capabilities"`.
- [x] **AC-03**: Every provider outcome maps to exactly one stable result state without converting DNS, HTTP, timeout, malformed, oversized, or trust failures into `not-found` → test: `test/lookup.test.ts > "AC-03: preserves provider outcome semantics"`.
- [x] **AC-04**: Direct discovery uses SML v1.3 U-NAPTR and SMP v1.4 HTTPS with bounded timeout, retry, response size, reference count, XML redirect depth, and no HTTP redirects → test: `test/peppol-provider.test.ts > "AC-04: enforces bounded direct discovery"`.
- [x] **AC-05**: Lookup evidence includes provider, participant, observed advertised identifiers, safe endpoint metadata, lookup time, cache status, signature status, and warnings → test: `test/lookup.test.ts > "AC-05: returns inspectable evidence"`.
- [x] **AC-06**: Positive and negative cache entries expire under separate conservative TTLs, while temporary and indeterminate failures are not cached → test: `test/cache.test.ts > "AC-06: applies conservative cache policy"`.
- [x] **AC-07**: Human and JSON CLI modes agree with the library state and implement documented stable exit codes → test: `test/cli.integration.test.ts > "AC-07: CLI and library outcomes agree"`.
- [x] **AC-08**: Default tests use only injected deterministic providers; a live smoke test requires an opt-in flag and caller-supplied Participant Identifier → test: `test/live.test.ts > "AC-08: live lookup is explicitly gated"`.
- [x] **AC-09**: Package documentation states connectivity, acceptable-use, privacy, security, versioning, and guarantee limits with authoritative source links → test: `test/documentation.test.ts > "AC-09: documents operational constraints"`.
- [x] **AC-10**: `pnpm build`, `pnpm lint`, `pnpm test`, and `pnpm pack --pack-destination <temp>` succeed for the package → test: release verification commands.

## Tech constraints

- **Language / runtime**: TypeScript, ESM, Node.js 20 or newer.
- **Key dependencies**: Node DNS/crypto/fetch APIs, `fast-xml-parser`, `commander`, Vitest, ESLint.
- **Output format**: Published library API plus `pint-anz-lookup` CLI with human and JSON output.
- **Deploy target**: npm package; no resident service or container.
- **Existing codebase**: pnpm monorepo under `packages/*`; follow the adjacent package build, lint, test, and pack conventions.
- **Architecture**: One package with domain, application, infrastructure, and presentation modules. Separate services would add deployment surface without an independent scaling or ownership need.
- **External boundary**: The package consumes standard SML DNS and SMP XML/HTTPS protocols but owns neither side; an OpenAPI document is not applicable.
- **No service waiver**: Docker, compose, service runner, health check, and OTEL tasks are not applicable because the deliverable is an invocation-scoped library/CLI, not a long-running service.
- **No web UI waiver**: Wireframes and design tokens are not applicable.
- **No code generation waiver**: No generated source is planned, so `regenerate-all.sh` is not required.
- **E2E equivalent**: CLI integration tests execute the built artifact and use AC IDs in test names.

## Assumptions

- The initial capability catalogue is pinned to PINT A-NZ Billing 1.1.2 and eDEC code lists 9.7: wildcard-scheme Invoice and CreditNote document values with `cenbii-procid-ubl::urn:peppol:bis:billing`.
- Production discovery defaults to SML zone `edelivery.tech.ec.europa.eu`, SML 1.3.0, SMP 1.4.0, and Identifier Policy 4.4.0; all are named in evidence/documentation.
- A direct ServiceGroup 404 or SML `ENODATA`/`ENOTFOUND` is participant `not-found`; any ambiguous resolver/server failure is `temporarily-unavailable` or `indeterminate`.
- SMP metadata may contain XML signatures. The initial package reports signature presence and accepts an injectable verifier; without an applied verifier, evidence says `not-verified` and carries a warning.
- HTTP redirects are rejected. The SMP XML Redirect model supports at most one validated HTTPS hop, matching the SMP specification.
- The default cache is in-memory and per-process. Callers needing persistence inject their own cache.
- The planned Dockerised `packages/playground` is a separate offline simulated counterparty endpoint. It is not discovered through production SML/SMP, and lookup integration with it must use explicit local configuration or an injected provider.
- Live lookup identifies the caller with a package/version User-Agent and uses bounded requests. No published request quota for sender discovery was found; the CLI performs single-participant lookups and documentation forbids bulk probing or bypassing provider limits.
- No real or apparently synthetic government identifier is embedded as a live target. Live smoke tests require a caller-supplied full Participant Identifier.

## Open questions

- [Q]: Should the initial release use the public OpenPeppol Lookup Service? → **No. Direct SML/SMP is the documented sender discovery mechanism; the web lookup service does not publish a stable package API or terms suitable for a default provider.** *(resolved)*
- [Q]: Does discovery require an Access Point? → **No. It requires outbound DNS and HTTPS only; AS4 and document transmission are out of scope.** *(resolved)*
- [Q]: Should self-billing be inferred from standard billing? → **No. It is a separate document and process capability and is excluded from the initial catalogue.** *(resolved)*
