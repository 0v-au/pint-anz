# PINT A-NZ toolkit

Build, test and troubleshoot [Peppol](https://peppol.org) e-invoicing for Australia and New Zealand.

This toolkit provides open source, MIT-licensed tools for the PINT A-NZ invoice specification. It helps teams validate documents, test integrations and check advertised receiving capabilities without relying on EU-specific Peppol tooling.

It is a developer toolkit, not an Access Point: it validates and inspects documents locally and does not send or receive anything on the Peppol network.

Try the linter below, or [make your first contribution](./CONTRIBUTING.md). Bug reports, documentation fixes and small pull requests are welcome.

## Start here

The `@pint-anz/*` packages are not yet published to npm. For now, build the `pint-anz-lint` CLI from a clone of this repository:

```bash
git clone https://github.com/0v-au/pint-anz.git
cd pint-anz
pnpm install
pnpm --filter @pint-anz/lint build
```

Install the pinned PINT A-NZ 1.1.2 ruleset once, then validate a UBL invoice or credit note. The installer downloads and verifies the official validation resources; after installation, validation runs without network access:

```bash
node packages/lint/bin/cli.js ruleset install 1.1.2
node packages/lint/bin/cli.js invoice.xml --ruleset-version 1.1.2 --offline
```

See the [`@pint-anz/lint` guide](./packages/lint) for library use, CI setup, security details and exit codes.

### Errors you can act on

The repository ships a fixture corpus (see [`@pint-anz/fixtures`](./packages/fixtures)), so you can see a real pass and a real failure before pointing the linter at your own documents. A known-good Australian invoice passes:

```bash
node packages/lint/bin/cli.js packages/fixtures/valid/invoice-au-standard.xml --ruleset-version 1.1.2 --offline
```

```text
PASS packages/fixtures/valid/invoice-au-standard.xml (PINT A-NZ 1.1.2)
  RULESET SHA-256 5750a93fe98c4e1bad1d1030f749a473d4b2c3afc5bdeb5372889804b4273d1a
```

A fixture whose Australian seller uses the wrong identifier scheme fails, naming the rule, its location, and what to fix. The command exits `1` on validation failure, so it drops into CI cleanly:

```bash
node packages/lint/bin/cli.js packages/fixtures/invalid/aligned-ibr-001-aunz.wrong-scheme.xml --ruleset-version 1.1.2 --offline
```

```text
FAIL packages/fixtures/invalid/aligned-ibr-001-aunz.wrong-scheme.xml (PINT A-NZ 1.1.2)
  RULESET SHA-256 5750a93fe98c4e1bad1d1030f749a473d4b2c3afc5bdeb5372889804b4273d1a
  ERROR aligned-ibr-001-aunz [business-rule] at /*:Invoice[namespace-uri()='urn:oasis:names:specification:ubl:schema:xsd:Invoice-2'][1]/*:AccountingSupplierParty[namespace-uri()='urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'][1]/*:Party[namespace-uri()='urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'][1]
    [aligned-ibr-001-aunz]-An invoice must contain the Seller's ABN (ibt-030) if Seller country (ibt-040) is Australia
    Guidance: https://pint-anz.0v.com.au/rules/1.1.2/aligned-ibr-001-aunz
```

## Choose a tool

| Package | Use it to | Status |
|---|---|---|
| [`lint`](./packages/lint) | validate UBL invoices and credit notes from the CLI, a library or CI | Available |
| [`lint-action`](./packages/lint-action) | validate pull requests with annotations, a job summary and a JSON report | Available |
| [`fixtures`](./packages/fixtures) | test against valid, invalid and malformed PINT A-NZ documents | Complete for 1.1.2 |
| [`lookup`](./packages/lookup) | find an ABN or NZBN participant and its advertised billing capabilities | Available |
| [`rules`](./packages/rules) | understand each business rule and how to fix a failure | In progress |
| `mapper` | compile a small, typed JSON model to compliant UBL XML | Planned |
| `playground` | test against a local fake Peppol counterparty | Planned |

## Validate pull requests in CI

The [`lint-action`](./packages/lint-action) wrapper runs the same validator on every pull request and turns failures into inline file annotations, a job summary and an optional JSON report. Drop this workflow into `.github/workflows/pint-anz.yml`:

```yaml
name: Validate e-invoices
on: [pull_request]

permissions:
  contents: read

jobs:
  pint-anz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: 0v-au/pint-anz/packages/lint-action@main
        with:
          files: |
            invoices/**/*.xml
```

`files` is the only required input; the action installs and verifies the pinned ruleset itself. This pins the action to `main` because no release tag is published yet; pin to a released tag once one exists. See the [`lint-action` guide](./packages/lint-action) for the full input list, outputs and exit codes.

## Use fixtures in tests

Until the packages are published to npm, `@pint-anz/fixtures` and `@pint-anz/lint` resolve as workspace packages inside this repository; add them with `pnpm add -D @pint-anz/fixtures vitest` once published. Pass a fixture to the linter like any other file. This Vitest example checks that a known-good Australian invoice passes the full validation pipeline:

```js
import { fileURLToPath } from "node:url";
import { fixtureUrl } from "@pint-anz/fixtures";
import { validateFile } from "@pint-anz/lint";
import { expect, test } from "vitest";

test("accepts a valid Australian invoice", async () => {
  const fixture = fileURLToPath(fixtureUrl("invoice-au-standard"));
  const result = await validateFile(fixture);

  expect(result).toMatchObject({
    complete: true,
    valid: true,
    documentType: "invoice",
    diagnostics: [],
  });
});
```

Install the ruleset in the [start here](#start-here) step before running the test.

## Check receiving capabilities

Use `lookup` to check whether a participant advertises support for a PINT A-NZ document. Live lookups use outbound DNS and HTTPS, but do not need a Peppol Access Point.

```bash
pnpm --filter @pint-anz/lookup build
node packages/lookup/bin/cli.js --abn "$ABN" --capability invoice
```

An advertised capability does not prove that an endpoint is operational or that it will accept an invoice. See the [`@pint-anz/lookup` guide](./packages/lookup) for result states, trust, privacy and caching limits.

## How PINT A-NZ works

Peppol invoices use UBL 2.1 XML. UBL defines the shared document structure, while each jurisdiction adds its own business rules.

PINT A-NZ adds the rules used in Australia and New Zealand. These cover participant identifiers such as ABNs and NZBNs, tax invoice data and GST treatment. The A-NZ Peppol Authorities maintain the Schematron ruleset.

An invoice can pass EU validation and still fail on the A-NZ network. This toolkit helps you find those differences before you send it.

## Design principles

1. Pin every ruleset version. Verify its integrity and make upgrades explicit.
2. Explain errors in terms people can act on, including what failed and how to fix it.
3. Support CI with stable exit codes, machine-readable output and GitHub Actions.
4. Prove behaviour with passing and failing fixtures.
5. Run offline after the required ruleset has been installed.

## Contribute

Contributions of every size are welcome. You do not need to be a Peppol expert to help.

Useful ways to get involved include:

- [report a confusing validation result or integration problem](https://github.com/0v-au/pint-anz/issues/new)
- improve documentation or error messages
- add a focused test fixture for a validation failure
- fix a bug or work on a planned tool

Start with the [contribution guide](./CONTRIBUTING.md). It explains how to prepare fixtures safely, set up the repository and submit a focused pull request.

Never share a real invoice or identifying business data. If you cannot create a safe reproduction, describe the problem instead.

## Develop locally

You need Node.js 20 or later, pnpm 9 or later, and `xmllint` from libxml2.

```bash
git clone https://github.com/0v-au/pint-anz.git
cd pint-anz
pnpm install
pnpm --filter @pint-anz/conformance run artefacts
pnpm build
pnpm test
```

The artefacts step fetches and verifies the pinned official validation resources that `@pint-anz/conformance` builds against; the workspace build fails without it, so run it first, exactly as CI does (`.github/workflows/ci.yml`).

This repository uses pnpm workspaces. Each tool lives under `packages/` and can be developed, tested and published independently.

```text
packages/
  lint/          CLI and library
  lint-action/   GitHub Action wrapper
  fixtures/      test documents and manifest
  lookup/        participant capability checks
  rules/         business rule documentation
  mapper/        JSON to UBL compiler
  playground/    local fake counterparty
```

## Project status

The PINT A-NZ 1.1.2 fixture corpus, linter and participant lookup are implemented; the rule catalogue ([`rules`](./packages/rules)) is in progress. See [TASKS.md](./TASKS.md) for the live plan and the generated conformance reports for coverage details and known upstream validation limits.

## Independence and trademarks

This is an independent open source project. It is not affiliated with or endorsed by OpenPeppol AISBL, the Australian Taxation Office, or the New Zealand Ministry of Business, Innovation and Employment.

Peppol is a registered trademark of OpenPeppol AISBL. The name is used here only to describe interoperability.

## License

Use, change and share this project under the [MIT License](./LICENSE).
