# Prompt: build `@pint-anz/lint`

You are implementing `packages/lint` in the PINT A-NZ Toolkit monorepo. Read the
root documentation and existing package manifest, inspect the worktree, and
preserve unrelated changes. Resolve TODO metadata rather than propagating it
into a release.

## Goal

Deliver an offline, zero-configuration Node.js 20+ library and CLI that validates
UBL 2.1 invoices and credit notes against a pinned PINT A-NZ ruleset and returns
errors that humans and CI systems can act on.

## Requirements

- Verify the current official distribution and licensing of the chosen PINT
  A-NZ validation artefacts. Pin their exact version and provenance in source,
  package metadata, output, and upgrade documentation.
- Design one validation pipeline with explicit stages: input/read failure, XML
  well-formedness and supported document detection, schema validation where the
  official distribution requires it, Schematron/business rules, and diagnostic
  normalisation. Do not present partial validation as full compliance.
- Expose a typed library API that accepts a path or document content and returns
  structured diagnostics without printing or terminating the process.
- Implement `pint-anz-lint <files...>` with glob/multiple-file support, readable
  default output, `--format json`, stable exit codes, `--ruleset-version`, and
  useful behaviour for missing, unreadable, malformed, and unsupported inputs.
- Bundle everything required for offline validation. Avoid runtime network calls
  and unsafe XML features such as external entity resolution.
- Keep diagnostic fields stable: severity, rule ID, message, location/path,
  document, ruleset version, and optional remediation link. Preserve upstream
  rule IDs and distinguish tool failures from document failures.
- Test public API behaviour, CLI output and exit codes, paths containing spaces,
  malformed XML, both document types, AU/NZ cases, JSON output, and package
  contents. Use `@pint-anz/fixtures` as the behavioural contract.
- Document API usage, CLI usage, validation coverage, security assumptions,
  performance expectations, and the ruleset upgrade procedure.

## Non-goals

Do not repair documents, make live network lookups, silently update the ruleset,
or invent friendlier explanations that could change the meaning of official
rules. Detailed remediation belongs in `@pint-anz/rules`.

## Done when

The package builds, tests, and packs cleanly; the README quick-start command is
real; fixture expectations are satisfied; JSON output is schema-tested; the CLI
is CI-safe and deterministic; and validation works from the packed package with
network access disabled. Report commands run, pinned artefact provenance, known
coverage gaps, and follow-up work.
