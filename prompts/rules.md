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

- Extract rule IDs and authoritative text from the exact official ruleset pinned
  by `@pint-anz/lint`; record provenance and never silently mix versions.
- Define a validated content schema with rule ID, severity, jurisdiction and
  document applicability, official summary, plain-language explanation, common
  causes, fix guidance, XML location/context, source reference, ruleset version,
  and linked passing/failing fixture IDs.
- Clearly distinguish official wording from project-authored explanation. Do not
  offer tax, legal, or accounting conclusions beyond the source material.
- Implement a typed lookup API and machine-readable export keyed by rule ID.
- Build an accessible, searchable static documentation site with stable URLs
  suitable for links from lint diagnostics. Unknown rule IDs need a useful
  fallback rather than a broken page.
- Begin with every rule represented by the initial fixtures, then add a coverage
  report showing documented, fixture-backed, and outstanding rules.
- Add schema, link, duplicate-ID, fixture-reference, site-build, and representative
  snapshot tests. Fail CI when a ruleset upgrade creates undocumented drift.
- Document the authoring workflow, review expectations, versioning, and how to
  add a rule explanation alongside fixtures.

## Non-goals

Do not duplicate the validation engine, scrape mutable web pages during normal
builds, or label project interpretation as official guidance.

## Done when

The package, exports, and site build deterministically; every fixture-backed rule
has a valid page and API record; links from representative lint diagnostics
resolve; accessibility and link checks pass; and the coverage report is generated
from source data. Report commands run and remaining documentation gaps.
