# Changelog

## 2026-07-17 — PINT A-NZ participant capability lookup

### Built

- Added the `@pint-anz/lookup` typed Node.js library and `pint-anz-lookup` CLI.
- Added local ABN, NZBN, and explicit Peppol Participant Identifier validation.
- Added bounded, read-only direct SML/SMP discovery for standard PINT A-NZ invoice and credit-note capabilities.
- Added stable result states, inspectable evidence, conservative in-memory caching, human/JSON output, and documented exit codes.
- Added deterministic provider, orchestration, CLI, documentation, and opt-in live-test coverage.

### Decisions and limits

- Discovery requires outbound DNS and HTTPS, but it does not require an Access Point or a Peppol network membership connection. Sending documents remains out of scope.
- Discovery evidence does not prove business existence, cryptographic trust, or end-to-end delivery readiness.
- Signature presence is reported. Cryptographic verification requires a caller-supplied verifier and trust policy; no trust anchors are bundled.
- PINT A-NZ self-billing capability is excluded from this release.
- No live participant was queried during verification. The live smoke test requires explicit opt-in and a caller-supplied Participant Identifier.
- No general published sender-discovery request quota was identified. Documentation prohibits bulk probing and requires callers to respect provider limits.
- The planned Docker playground is a separate offline simulated counterparty, not a production-discovered Peppol endpoint; local integration must be explicit or provider-injected.
- Deployment, health-check, container, and OpenTelemetry work is not applicable to this invocation-scoped library and CLI.

### Code review fixes

- Added the published SML 1.3 participant hash vector as an offline regression fixture.
- Corrected SMP redirect parsing to require the `CertificateUID` child element and pass it to the destination signature verifier for Subject Unique Identifier validation.

### Verification

- Completed 8 of 8 tasks with 2 retries, 2 review cycles, 0 blocked tasks, and 0 escalations.
- Passed package pack inspection and full workspace build, test, and lint gates.
