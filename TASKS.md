# Tasks
> Sources: SPEC.md and prompts/README.md · Loop started: 2026-07-16
> Progress: 13/18 done · 0 in-progress · 0 blocked · 5 todo

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

---

## Batch 5

## T012 — Audit redistribution of official rule content
- **Status**: done
- **Prompt ref**: Copyright prerequisite for `prompts/rules.md`
- **Acceptance**: Review all tracked and publishable files for copied or closely derived OpenPeppol rule messages, assertions, examples, and specification text; record the exact official copyright-notice location and section, a short compliant excerpt of its operative restriction, source URLs, lookup date, permission status, and affected fields/files; obtain written redistribution clarification or define and verify a rights-safe replacement that preserves conformance evidence without publishing restricted content; document the outcome and add a release check that prevents unapproved official content entering npm or the static site.
- **Depends on**: existing conformance inventory and coverage data
- **Priority**: critical-path
- **Output**: `docs/licensing/pint-a-nz-content-audit.md`, `docs/licensing/official-example-fingerprints.json`, `scripts/check-published-rights.mjs`, focused tests and package lifecycle gates
- **Notes**: No permission is recorded; current npm packs pass, but the tracked full inventory/COVERAGE report are not cleared for publication and must be replaced by T018 before T009.
- **Retries**: 0
- **Review cycles**: 2

---

## T018 — Replace tracked official expressions with rights-safe conformance evidence
- **Status**: done
- **Prompt ref**: T012 migration plan and `prompts/rules.md` copyright boundary
- **Acceptance**: The tracked repository contains no verbatim official rule messages, XPath assertions/contexts, official examples, or exact assertion quotations except short attributed excerpts allowed by the documented policy; conformance derives the full working inventory only from the locally downloaded checksum-verified artefacts, checks a tracked rights-safe identity/provenance projection for all 245 rules, preserves reviewed coverage states and independently authored observations, and regenerates a rights-safe public report; clean-clone build/test/release checks fail when artefacts are missing or drift, when the projection/coverage diverges, or when protected official expression re-enters tracked or publishable output.
- **Depends on**: T012
- **Priority**: critical-path
- **Output**: rights-safe tracked rule projection, transient full-inventory build path, rewritten coverage evidence/report, migration and regression tests
- **Notes**: Preserved all 245 identities, statuses, fixture links, and detailed project observations while replacing protected expressions. Build/test/release now verify pinned ZIPs, extracted XSDs, rule sources, deterministic SEFs, projection/coverage/report drift, tracked content, and actual npm pack output.
- **Retries**: 0
- **Review cycles**: 2

---

## T009 — Scaffold the rights-safe rule catalogue and typed API
- **Status**: done
- **Prompt ref**: `prompts/rules.md`
- **Acceptance**: `@pint-anz/rules` builds and packs a version-pinned, rights-safe snapshot containing exactly the 245 official rule identities and reviewed coverage records; its schema keeps `official`, `coverage`, `applicability`, and optional project-authored `guidance` structures distinct; each record has one reviewed primary topic and zero or more related topics from a controlled vocabulary; the typed API exposes a readonly `rules` collection, `getRule(id)` returning `undefined` for unknown identifiers, and `findRules(filters)` for version, jurisdiction, document type, topic, severity, family, coverage, and editorial state; schema, provenance, duplicate-ID, fixture-reference, export, and published-content checks pass without a runtime dependency on private conformance data.
- **Depends on**: T008, T012, T018; existing `@pint-anz/fixtures` and `@pint-anz/lint`
- **Priority**: critical-path
- **Output**: `packages/rules` package, validated content schema/editorial review, generated 245-record snapshot, typed lookup/filter API, package tests
- **Notes**: Runtime data is self-contained; build-time generation verifies locked provenance, reviewed coverage, explicit editorial metadata, fixture references, and the rights-safe publication boundary.
- **Retries**: 0
- **Review cycles**: 1

---

## T013 — Add remediation links and local official-rule inspection
- **Status**: done
- **Prompt ref**: `prompts/rules.md` diagnostic-link integration
- **Acceptance**: Every `@pint-anz/lint` business-rule diagnostic with a rule ID receives the canonical versioned `pint-anz.0v.com.au` remediation URL without a runtime dependency on `@pint-anz/rules`; `pint-anz-lint ruleset show <rule-id>` reads only from the installed checksum-verified OpenPeppol artefact and supports human and `--json` output containing ID, severity, official message, XPath context/test, version/digest, source, and copyright notice; stable exits are `0` found, `1` unknown, and `2` unavailable/unverified/tool failure; unit, CLI integration, and URL contract tests pass.
- **Depends on**: T009, T012
- **Priority**: critical-path
- **Output**: `packages/lint/src/remediation.ts`, `packages/lint/src/rule-inspection.ts`, CLI integration, tests, documentation, regenerated Action bundle
- **Notes**: Diagnostics use canonical versioned URLs; `ruleset show` reads and re-hashes only the user's verified local artefacts and never bundles official text.
- **Retries**: 0
- **Review cycles**: 1

## T014 — Author the initial 15–25 rule interpretations
- **Status**: done
- **Prompt ref**: `prompts/rules.md` staged launch content
- **Acceptance**: A representative launch set of 15–25 high-value fixture-backed rules has schema-valid, reviewed, versioned plain-Markdown records spanning A-NZ-aligned and shared PINT families, AU and NZ relevance, invoice and credit-note applicability, and the major implementer topics; each has an independently written project interpretation, common causes, safe fix guidance, and minimal failing/corrected XML fragments backed by complete synthetic documents exercised against the pinned validator; selection criteria and remaining gaps are reported explicitly.
- **Depends on**: T009, T012
- **Priority**: critical-path
- **Output**: 15 reviewed interpretations under `packages/rules/content/interpretations/1.1.2`, metadata schema/parser, gap report, selection report, validator-backed tests
- **Notes**: Launch content uses immutable OpenPeppol `2025-Q4` links and 30 checksum-verified document validations; T015 must deliberately expand the current 15–25 tranche gate.
- **Retries**: 0
- **Review cycles**: 1

## T015 — Expand interpretations using observed demand
- **Status**: todo
- **Prompt ref**: `prompts/rules.md` progressive content expansion
- **Acceptance**: Use Search Console queries, correction requests, conformance gaps, and topic coverage to select the next bounded tranche of 15–25 fixture-backed rules; publish reviewed interpretations and tested corrections to the same standard as T014; update the generated gap report and file another bounded tranche only when evidence supports it.
- **Depends on**: T017
- **Priority**: normal
- **Output**: next evidence-selected interpretation tranche, validated examples, updated gap report
- **Notes**: Editorial state is `draft` or `reviewed`, and release builds reject fixture-backed drafts. Reviewer identity remains in pull-request history. Content must call itself a project interpretation and link to the copyrighted original. Source hierarchy is OpenPeppol for rules/PINT semantics, ATO for Australian tax context, Inland Revenue for New Zealand tax context, and project fixtures/validator observations for implementation behaviour; do not use unsourced blogs or vendor interpretations.
- **Retries**: 0
- **Review cycles**: 0

## T016 — Build and deploy the searchable static rule site
- **Status**: todo
- **Prompt ref**: `prompts/rules.md` documentation site
- **Acceptance**: Astro generates stable pages for all 245 rules at `/rules/1.1.2/<rule-id>`, a topic-first accessible catalogue searchable and filterable by rule family and coverage status through Pagefind, and a helpful `noindex` unknown-rule fallback; launch-set pages use a polished responsive template with a unique project-authored title and description, self-canonical URL, semantic headings, coverage/applicability, relevant internal links, project-interpretation notice, an official-source panel containing the exact official link plus checksum-verified install and local `ruleset show` instructions, and a correction link that opens a prefilled GitHub issue with the rule ID and ruleset version; catalogue-only pages clearly report that project interpretation is pending and are excluded from indexing until reviewed substantive guidance exists; version selection links to the same rule ID only when it exists and explicitly reports added, changed, removed, or unavailable states without silent redirects; substantive pages appear in the sitemap and the site deploys reproducibly to its canonical Cloudflare-hosted domain.
- **Depends on**: T009, T013, T014
- **Priority**: critical-path
- **Output**: Astro site, rule-page template, Pagefind index and search UI, sitemap/robots metadata, Cloudflare Pages deployment and canonical-host redirect configuration
- **Notes**: The primary reader is an implementer arriving from a validator diagnostic or web search. Organise browsing primarily by implementer topics such as identifiers, parties, tax, totals, lines, payments, references, and code lists; rule family and coverage are secondary facets. Use a calm, high-density technical-reference visual direction with strong typography, restrained colour, accessible status badges, and excellent code/diff presentation rather than decorative imagery. Lead each substantive page with the rule ID, affected documents, plain-English project interpretation, and tested correction; include accounting context only when supported by an authoritative source and never present it as advice. Index only reviewed substantive pages; catalogue-only, search-result, filtered, and fallback pages are `noindex`. Launch without third-party visitor analytics; Pagefind remains client-side, while sitemap publication and Search Console verification are allowed without behavioural tracking. Do not mirror official downloads or use thin/generated SEO copy.
- **Retries**: 0
- **Review cycles**: 0

## T017 — Release-verify and document the rules package and site
- **Status**: todo
- **Prompt ref**: `prompts/rules.md` completion and authoring workflow
- **Acceptance**: Package build, lint, tests, pack inspection, site build, Pagefind indexing, link checks, accessibility checks, representative snapshots, example validation, diagnostic-link resolution, sitemap/canonical/noindex checks, authoritative-source policy checks, and rights-safe published-content scans pass; a generated report accounts for all 245 rules, the reviewed 15–25-page launch set, and remaining interpretation/fixture gaps; authoring, source hierarchy, review, staged publication, versioning, official-source access, copyright boundary, and upgrade workflows are documented; a ruleset upgrade fails on inventory drift, resets copied interpretations to `draft`, records added/changed/removed rule states, and preserves older versioned pages.
- **Depends on**: T013, T014, T016
- **Priority**: critical-path
- **Output**: release gates, generated coverage report, authoring/versioning documentation, pack/site verification evidence
- **Notes**: Record any written redistribution permission before allowing additional official content into published artefacts. The production gate permits clearly labelled `noindex` catalogue-only pages but rejects drafts presented as reviewed guidance, untested corrections, accidental indexing of pending content, and broken linter remediation links.
- **Retries**: 0
- **Review cycles**: 0

---

## Batch 6

## T010 — Build the typed JSON-to-UBL mapper
- **Status**: todo
- **Prompt ref**: `prompts/mapper.md`
- **Acceptance**: `@pint-anz/mapper` validates a deliberately small typed input model and deterministically emits namespace-correct PINT A-NZ UBL 2.1 XML for the supported AU/NZ invoice and credit-note cases; decimal-safe money and tax invariants, structured input errors, escaping, ordering, identifiers, discounts/charges, rounding, and unsupported cases are tested; generated documents pass the pinned `@pint-anz/lint`; build, test, lint, and pack checks pass.
- **Depends on**: T017; existing `@pint-anz/fixtures` and `@pint-anz/lint`
- **Priority**: normal
- **Output**: `packages/mapper`, typed API and JSON schema, deterministic XML compiler, golden/integration/property tests, package documentation
- **Notes**: Do not mirror all of UBL or accept arbitrary pass-through fields. Document ownership of derived totals, supported use cases, assumptions, limitations, error semantics, and the ruleset upgrade process.
- **Retries**: 0
- **Review cycles**: 0

---

## Batch 7

## T011 — Build the Dockerised local counterparty playground
- **Status**: todo
- **Prompt ref**: `prompts/playground.md`
- **Acceptance**: One documented command starts a healthy, non-root, offline-capable container exposing versioned submission, polling, reset, and scenario configuration interfaces; all named deterministic scenarios are covered through the transparent bounded state machine; uploaded XML is safely constrained and validated by `@pint-anz/lint`; API, fixture integration, restart/reset/idempotency, security, offline, and Docker smoke tests pass in CI without production credentials.
- **Depends on**: T010; existing `@pint-anz/fixtures` and `@pint-anz/lint`
- **Priority**: normal
- **Output**: `packages/playground`, versioned HTTP API and CLI/examples, Docker image and health check, scenario/state-machine tests, operational documentation
- **Notes**: State explicitly that this is a local simulated counterparty, not a certified Access Point. Include accept, validation reject, business reject, delay, timeout, transient error, duplicate, out-of-order, and malformed-response scenarios; randomness requires an explicit seed.
- **Retries**: 0
- **Review cycles**: 0
