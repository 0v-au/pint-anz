# PINT A-NZ Toolkit

Open-source developer tools for [Peppol](https://peppol.org) e-invoicing in Australia and New Zealand.

Everything here is built around **PINT A-NZ** — the invoice specification used on the Australian and New Zealand Peppol network since May 2025 — because almost all existing Peppol tooling targets the EU's BIS Billing 3.0 and doesn't understand A-NZ rules, identifiers, or GST.

> **Why now?** Australian federal agencies must process 30% of invoices via eInvoicing from July 2026 and support fully automated sending and receiving by **December 2026**. Thousands of suppliers, agencies, and their integrators are wiring this up right now, largely without purpose-built tools.

## Tools

| Package | What it does | Status |
|---|---|---|
| [`lint`](./packages/lint) | Validate UBL invoices and credit notes against pinned PINT A-NZ rules from the CLI or CI. | Implemented |
| [`lint-action`](./packages/lint-action) | Run the linter as a GitHub Action with pull request annotations, a job summary, and a JSON report. | Implemented |
| [`fixtures`](./packages/fixtures) | Synthetic valid, invalid, and malformed PINT A-NZ documents with a machine-readable manifest. | Complete for 1.1.2 |
| [`lookup`](./packages/lookup) | Check whether an ABN/NZBN is registered on the Peppol network and which document types it can receive. | Planned |
| [`rules`](./packages/rules) | Human-readable explanations of every PINT A-NZ business rule: what it means, a failing example, how to fix it. | Planned |
| [`mapper`](./packages/mapper) | A typed, minimal JSON schema that compiles to compliant PINT A-NZ UBL XML. | Planned |
| [`playground`](./packages/playground) | A local fake Peppol counterparty in a Docker container: send it documents, get scripted accepts, rejects, and misbehaviour back. |  Planned |

## Lint workflow

Install the exact ruleset from the official source or reviewed local archives:

```bash
pint-anz-lint ruleset install 1.1.2

# Air-gapped or controlled CI
pint-anz-lint ruleset install 1.1.2 \
  --file /tmp/resources.zip \
  --ubl-file /tmp/UBL-2.1.zip \
  --offline
```

Then validate deterministically without network access:

```bash
pint-anz-lint invoice.xml --ruleset-version 1.1.2 --offline
pint-anz-lint 'test/invoices/**/*.xml' --format json --offline
```

See the [`@pint-anz/lint` documentation](./packages/lint) for cache, integrity,
licensing, security, and exit-code behaviour.

Use the current fixture corpus in tests:

```js
import { fixtureUrl } from "@pint-anz/fixtures";

const validInvoice = fixtureUrl("invoice-au-standard");
```

## What is PINT A-NZ, in one paragraph?

Peppol documents are UBL 2.1 XML. The structure (XSD) is global, but each jurisdiction layers its own business rules on top. PINT A-NZ is the Australia/New Zealand layer: ABN- and NZBN-based participant identifiers, Australian tax invoice data requirements, GST treatment, and a Schematron ruleset maintained for the A-NZ Peppol Authorities (the ATO and MBIE). An invoice that validates against EU rules can still be rejected on the A-NZ network — which is precisely the gap this toolkit exists to close.

## Design principles

1. **Deterministic setup.** Rulesets are explicitly versioned, integrity-checked, cached, and usable offline after installation.
2. **Errors a human can act on.** Raw Schematron output tells you *that* rule `aligned-ibrp-052-aunz` failed. We tell you *what that means* and *how to fix it*.
3. **CI-first.** Exit codes, machine-readable output (`--format json`), and GitHub Actions ship with every tool.
4. **The fixtures are the spec.** Each rule gets a passing and a failing document. If behaviour is ambiguous, we add a fixture, not a paragraph.
5. **Track the ruleset.** PINT A-NZ is versioned and moves. Tools pin a ruleset version and digest and make upgrades explicit, so a spec release never silently breaks your build.

## Repo layout

```
packages/
  lint/          CLI + library
  lint-action/   GitHub Action wrapper
  fixtures/      golden & broken documents (published as a package)
  lookup/        participant readiness checks
  rules/         rule documentation (builds the docs site)
  mapper/        JSON → UBL compiler
  playground/    local fake counterparty
```

## Contributing

Issues and PRs welcome. The most valuable contribution right now is **fixtures**: if you've hit a validation failure in the wild that isn't in the corpus, a minimal reproducing document (with anything sensitive stripped) is gold. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Status & roadmap

The PINT A-NZ 1.1.2 fixture corpus and lint package are implemented. See
[TODO.md](./TODO.md) and the generated conformance reports for coverage details
and known upstream validation limits.

## Trademark & affiliation

This is an independent open-source project. It is **not** affiliated with or endorsed by OpenPeppol AISBL, the Australian Taxation Office, or the NZ Ministry of Business, Innovation & Employment. "Peppol" is a registered trademark of OpenPeppol AISBL, used here only to describe interoperability.

## License

[MIT](./LICENSE)
