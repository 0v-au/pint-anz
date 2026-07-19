# Prompt: build `@pint-anz/rules`

You are implementing `packages/rules` in the PINT A-NZ Toolkit monorepo. Read the
root documentation, inspect existing fixtures and validator diagnostics, and
preserve unrelated changes.

## Goal

Create a versioned, human-readable catalogue of PINT A-NZ business rules that
explains each failure, shows a minimal failing example, and gives a safe path to
fix it. The same source must support programmatic lookup and a documentation
site.

## Requirements

- Extract and verify rule IDs against the exact official ruleset pinned by
  `@pint-anz/lint`; record provenance and never silently mix versions. Treat
  official wording, assertions, examples and specification text as copyrighted:
  do not include them in published output without recorded written permission.
- Define a validated content schema with rule ID, severity, jurisdiction and
  document applicability, project-authored summary and interpretation, common
  causes, fix guidance, affected XML terms/locations described independently,
  authoritative source link, ruleset version, and linked passing/failing fixture
  IDs.
- Link to the exact official rule and clearly label independently authored
  project interpretations. Write from observed validator and fixture behaviour,
  not by sentence-level paraphrase. Do not offer tax, legal, or accounting
  conclusions beyond authoritative sources.
- Implement a typed lookup API and machine-readable export keyed by rule ID.
- Build an accessible, searchable static documentation site at
  `pint-anz.0v.com.au` with versioned stable URLs suitable for links from lint
  diagnostics. Unknown rule IDs need a useful `noindex` fallback rather than a
  broken page.
- Publish rights-safe catalogue pages for every official rule. Launch with a
  representative, reviewed tranche of 15–25 fixture-backed interpretations and
  tested corrections; clearly mark remaining interpretations pending, exclude
  them from indexing, and generate a gap report for evidence-led later tranches.
- On every page, link to the copyrighted original and explain how to use the
  linter to download, checksum-verify and inspect the exact official rule
  locally. Do not proxy or mirror the official artefacts.
- Add schema, link, duplicate-ID, fixture-reference, site-build, and representative
  snapshot tests. Fail CI when a ruleset upgrade creates undocumented drift.
- Document the authoring workflow, review expectations, versioning, and how to
  add a project interpretation alongside fixtures.

## Non-goals

Do not duplicate the validation engine, scrape mutable web pages during normal
builds, or label project interpretation as official guidance.

## Done when

The package, exports, and site build deterministically; every official rule has a
rights-safe catalogue page and API record; 15–25 representative fixture-backed
rules have reviewed interpretations and validator-backed corrections; pending
pages are clearly labelled and excluded from indexing; links from representative
lint diagnostics resolve; accessibility, link, copyright-boundary and indexing
checks pass; and the coverage report is generated from source data. Report
commands run and remaining documentation gaps.
