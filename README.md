# PINT A-NZ toolkit

Build, test and troubleshoot [Peppol](https://peppol.org) e-invoicing for Australia and New Zealand.

This toolkit provides open source, MIT-licensed tools for the PINT A-NZ invoice specification. It helps teams validate documents, test integrations and check advertised receiving capabilities without relying on EU-specific Peppol tooling.

Try the linter below, or [make your first contribution](./CONTRIBUTING.md). Bug reports, documentation fixes and small pull requests are welcome.

## Start here

Validate a UBL invoice or credit note with the PINT A-NZ 1.1.2 ruleset:

```bash
pnpm add -D @pint-anz/lint
pnpm exec pint-anz-lint ruleset install 1.1.2
pnpm exec pint-anz-lint invoice.xml --ruleset-version 1.1.2 --offline
```

The ruleset installer downloads and verifies the official validation resources. After installation, validation can run without network access.

See the [`@pint-anz/lint` guide](./packages/lint) for library use, CI setup, security details and exit codes.

## Choose a tool

| Package | Use it to | Status |
|---|---|---|
| [`lint`](./packages/lint) | validate UBL invoices and credit notes from the CLI, a library or CI | Available |
| [`lint-action`](./packages/lint-action) | validate pull requests with annotations, a job summary and a JSON report | Available |
| [`fixtures`](./packages/fixtures) | test against valid, invalid and malformed PINT A-NZ documents | Complete for 1.1.2 |
| [`lookup`](./packages/lookup) | find an ABN or NZBN participant and its advertised billing capabilities | Available |
| `rules` | understand each business rule and how to fix a failure | Planned |
| `mapper` | compile a small, typed JSON model to compliant UBL XML | Planned |
| `playground` | test against a local fake Peppol counterparty | Planned |

## Use fixtures in tests

Install the fixture package:

```bash
pnpm add -D @pint-anz/fixtures vitest
```

Pass the fixture to the linter like any other file. This Vitest example checks that a known-good Australian invoice passes the full validation pipeline:

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
pnpm add -D @pint-anz/lookup
pnpm exec pint-anz-lookup --abn "$ABN" --capability invoice
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
pnpm build
pnpm test
```

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

The PINT A-NZ 1.1.2 fixture corpus, linter and participant lookup are implemented. See [TODO.md](./TODO.md) and the generated conformance reports for coverage details, planned work and known upstream validation limits.

## Independence and trademarks

This is an independent open source project. It is not affiliated with or endorsed by OpenPeppol AISBL, the Australian Taxation Office, or the New Zealand Ministry of Business, Innovation and Employment.

Peppol is a registered trademark of OpenPeppol AISBL. The name is used here only to describe interoperability.

## License

Use, change and share this project under the [MIT License](./LICENSE).
