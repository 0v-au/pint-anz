# PINT A-NZ Toolkit

Open-source developer tools for [Peppol](https://peppol.org) e-invoicing in Australia and New Zealand.

Everything here is built around **PINT A-NZ** — the invoice specification used on the Australian and New Zealand Peppol network since May 2025 — because almost all existing Peppol tooling targets the EU's BIS Billing 3.0 and doesn't understand A-NZ rules, identifiers, or GST.

> **Why now?** Australian federal agencies must process 30% of invoices via eInvoicing from July 2026 and support fully automated sending and receiving by **December 2026**. Thousands of suppliers, agencies, and their integrators are wiring this up right now, largely without purpose-built tools.

## Tools

| Package | What it does | Status |
|---|---|---|
| [`lint`](./packages/lint) | Validate a UBL invoice against PINT A-NZ rules from the CLI or CI. Zero config. | In progress |
| [`fixtures`](./packages/fixtures) | A corpus of golden PINT A-NZ documents — valid invoices, credit notes, GST edge cases — plus deliberately broken files, each named for the rule it violates. | In progress |
| [`lookup`](./packages/lookup) | Check whether an ABN/NZBN is registered on the Peppol network and which document types it can receive. | Planned |
| [`rules`](./packages/rules) | Human-readable explanations of every PINT A-NZ business rule: what it means, a failing example, how to fix it. | Planned |
| [`mapper`](./packages/mapper) | A typed, minimal JSON schema that compiles to compliant PINT A-NZ UBL XML. | Planned |
| [`playground`](./packages/playground) | A local fake Peppol counterparty in a Docker container: send it documents, get scripted accepts, rejects, and misbehaviour back. |  Planned |

## Quick start

Validate an invoice:

```bash
npx pint-anz-lint invoice.xml
```

```
✖ invoice.xml — 2 errors, 1 warning

  ERROR  ibr-cl-25   Endpoint identifier scheme must be from the approved list
                     └─ cbc:EndpointID/@schemeID is "0088", expected e.g. "0151" (ABN)

  ERROR  aligned-ibrp-052-aunz
                     GST category code E is invalid for an AU supplier
                     └─ line 2: use "GST" category with 0% rate for GST-free supplies

  WARN   ibr-057     Payment due date is before issue date

Docs: https://…/rules/ibr-cl-25
```

Fail your CI when an invoice regresses:

```yaml
# .github/workflows/einvoicing.yml
- uses: <org>/pint-anz-toolkit/lint-action@v1
  with:
    files: "test/invoices/**/*.xml"
```

Grab known-good and known-bad test documents:

```bash
cp node_modules/@pint-anz/fixtures/valid/invoice-standard.xml   test/
cp node_modules/@pint-anz/fixtures/invalid/ibr-cl-25.xml        test/
```

## What is PINT A-NZ, in one paragraph?

Peppol documents are UBL 2.1 XML. The structure (XSD) is global, but each jurisdiction layers its own business rules on top. PINT A-NZ is the Australia/New Zealand layer: ABN- and NZBN-based participant identifiers, Australian tax invoice data requirements, GST treatment, and a Schematron ruleset maintained for the A-NZ Peppol Authorities (the ATO and MBIE). An invoice that validates against EU rules can still be rejected on the A-NZ network — which is precisely the gap this toolkit exists to close.

## Design principles

1. **Zero config.** Every tool works with no setup: sensible defaults, current ruleset bundled, offline where possible.
2. **Errors a human can act on.** Raw Schematron output tells you *that* rule `aligned-ibrp-052-aunz` failed. We tell you *what that means* and *how to fix it*.
3. **CI-first.** Exit codes, machine-readable output (`--format json`), and GitHub Actions ship with every tool.
4. **The fixtures are the spec.** Each rule gets a passing and a failing document. If behaviour is ambiguous, we add a fixture, not a paragraph.
5. **Track the ruleset.** PINT A-NZ is versioned and moves. Tools pin a ruleset version and make upgrades explicit, so a spec release never silently breaks your build.

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

This toolkit is young and moving fast. Current focus: shipping `lint` and `fixtures` against the latest PINT A-NZ release. Follow the [issues](../../issues) for the roadmap discussion.

## Trademark & affiliation

This is an independent open-source project. It is **not** affiliated with or endorsed by OpenPeppol AISBL, the Australian Taxation Office, or the NZ Ministry of Business, Innovation & Employment. "Peppol" is a registered trademark of OpenPeppol AISBL, used here only to describe interoperability.

## License

[MIT](./LICENSE)