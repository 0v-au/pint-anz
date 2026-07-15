# Prompt: build `@pint-anz/fixtures`

You are implementing `packages/fixtures` in the PINT A-NZ Toolkit monorepo.
Read the root `README.md` and `CONTRIBUTING.md` before changing anything, inspect
the worktree, and preserve unrelated changes.

## Goal

Publish a deterministic corpus of synthetic UBL 2.1 invoices and credit notes
that acts as executable documentation for the pinned PINT A-NZ ruleset. Include
known-good documents, documents that each fail exactly one business rule, and a
small separate set of malformed/schema-invalid documents.

## Requirements

- Create a publishable `@pint-anz/fixtures` package with `valid/`, `invalid/`,
  and `malformed/` corpora and a `parties.md` catalogue of checksum-valid,
  clearly synthetic AU and NZ test parties.
- Pin and record the exact official PINT A-NZ ruleset version and source. Do not
  guess rule semantics or copy documents whose redistribution rights are
  unclear.
- Put the metadata block specified in `CONTRIBUTING.md` at the start of every
  fixture. Invalid fixture filenames must identify the expected rule.
- Start with a small representative vertical slice: standard AU invoice,
  standard NZ invoice, credit note, GST/GST-free cases, identifier schemes,
  totals, dates, and one malformed XML example. Prefer depth and provability to
  nominal coverage.
- Add a manifest that machines can consume, containing fixture path, document
  type, jurisdiction, expected result, expected rule IDs, and ruleset version.
- Add tests that validate the manifest, metadata, uniqueness, absence of obvious
  real/customer data, and the one-rule-per-invalid-fixture invariant. Integrate
  with `@pint-anz/lint` only in a way that avoids a circular package dependency;
  a root integration test is acceptable.
- Document how to add, sanitise, validate, and consume fixtures.

## Non-goals

Do not build a validator, generate examples dynamically during package install,
or claim complete rule coverage before the manifest proves it.

## Done when

The package builds and packs cleanly; consumers can resolve fixture paths and
read the manifest; valid fixtures produce no validation failures; each invalid
fixture produces exactly its declared failure; malformed fixtures are reported
as parse/schema failures; and tests run through the monorepo's standard scripts.
Summarise supported coverage, commands run, and any official rules that remain
unrepresented.
