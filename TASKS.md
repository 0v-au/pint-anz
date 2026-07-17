# Tasks
> Spec: SPEC.md · Loop started: 2026-07-16
> Progress: 8/8 done · 0 in-progress · 0 blocked · 0 todo

---

## Batch 1

## T001 — Scaffold the package and public contracts
- **Status**: done
- **Spec ref**: §Tech constraints; AC-03, AC-05
- **Acceptance**: Package configuration builds and exported public DTOs have exact state unions, field documentation, and examples.
- **Depends on**: —
- **Priority**: critical-path
- **Output**: `packages/lookup/package.json`, package configs, `packages/lookup/src/types.ts`, `packages/lookup/src/index.ts`
- **Notes**: Public contracts and pinned version constants are exported from `src/types.ts`.
- **Retries**: 1
- **Review cycles**: 1

---

## Batch 2

## T002 — Implement Participant Identifier parsing
- **Status**: done
- **Spec ref**: AC-01
- **Acceptance**: AC-01 tests pass for ABN, NZBN, explicit identifiers, whitespace, leading zeroes, and invalid checksums.
- **Depends on**: T001
- **Priority**: normal
- **Output**: `packages/lookup/src/identifiers.ts`, `packages/lookup/test/identifiers.test.ts`
- **Notes**: Parsing is non-throwing and explicit 0151/0088 values receive local checksum validation.
- **Retries**: 0
- **Review cycles**: 0

## T003 — Implement capability catalogue and mapping
- **Status**: done
- **Spec ref**: AC-02
- **Acceptance**: AC-02 tests map exact and best-match wildcard advertisements for Invoice and CreditNote without mapping unrelated or self-billing records.
- **Depends on**: T001
- **Priority**: normal
- **Output**: `packages/lookup/src/capabilities.ts`, `packages/lookup/test/capabilities.test.ts`
- **Notes**: Mapper accepts current wildcard-scheme exact and trailing-star best-match advertisements only.
- **Retries**: 0
- **Review cycles**: 0

## T004 — Implement conservative cache
- **Status**: done
- **Spec ref**: AC-06
- **Acceptance**: AC-06 tests prove separate expiry and non-caching of failure states using an injected clock.
- **Depends on**: T001
- **Priority**: normal
- **Output**: `packages/lookup/src/cache.ts`, `packages/lookup/test/cache.test.ts`
- **Notes**: Cache key includes provider, canonical participant, and requested capability; failure states are never cached.
- **Retries**: 0
- **Review cycles**: 0

---

## Batch 3

## T005 — Implement direct Peppol provider
- **Status**: done
- **Spec ref**: AC-04
- **Acceptance**: AC-04 provider contract tests cover DNS, HTTPS/XML, safe URL policy, bounded retries, malformed/oversized bodies, and SMP XML redirects.
- **Depends on**: T002, T003
- **Priority**: critical-path
- **Output**: `packages/lookup/src/peppol-provider.ts`, `packages/lookup/src/xml.ts`, `packages/lookup/test/peppol-provider.test.ts`
- **Notes**: Provider enumerates ServiceGroup first, validates returned identities, and retrieves only relevant metadata with bounded DNS/HTTPS.
- **Retries**: 0
- **Review cycles**: 1

## T006 — Implement lookup orchestration
- **Status**: done
- **Spec ref**: AC-03, AC-05, AC-06
- **Acceptance**: AC-03 and AC-05 tests pass for every state and evidence field; cache integration follows AC-06 policy.
- **Depends on**: T002, T003, T004
- **Priority**: critical-path
- **Output**: `packages/lookup/src/lookup.ts`, `packages/lookup/test/lookup.test.ts`
- **Notes**: `lookup()` parses before constructing the default provider and retains original observation time on cache hits.
- **Retries**: 0
- **Review cycles**: 0

---

## Batch 4

## T007 — Implement CLI and live-test gate
- **Status**: done
- **Spec ref**: AC-07, AC-08
- **Acceptance**: Built CLI integration tests cover human/JSON parity and exit codes; live tests skip unless both opt-in flag and participant input are set.
- **Depends on**: T005, T006
- **Priority**: normal
- **Output**: `packages/lookup/src/cli.ts`, `packages/lookup/bin/cli.js`, CLI/live tests
- **Notes**: CLI accepts exactly one typed identifier flag; live tests require both opt-in and caller-supplied participant environment variables.
- **Retries**: 0
- **Review cycles**: 0

## T008 — Document and release-verify the package
- **Status**: done
- **Spec ref**: AC-09, AC-10
- **Acceptance**: Documentation test passes and package build, lint, deterministic tests, pack inspection, and monorepo tests succeed.
- **Depends on**: T005, T006, T007
- **Priority**: normal
- **Output**: `packages/lookup/README.md`, root README/package metadata, `CHANGELOG.md`, documentation tests
- **Notes**: Package pack inspection and complete workspace build, test, and lint gates passed; the live smoke test remained intentionally gated because no caller-supplied participant was provided.
- **Retries**: 1
- **Review cycles**: 0
