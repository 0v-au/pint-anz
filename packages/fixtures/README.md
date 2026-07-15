# `@pint-anz/fixtures`

Synthetic UBL 2.1 documents for testing software that supports PINT A-NZ.

The corpus is pinned to the active PINT A-NZ Billing Process **v1.1.2**. The
official specification and downloadable artefacts are the authority; this
package does not silently follow future releases.

## Corpus

- `valid/` contains documents intended to pass schema and business-rule checks.
- `invalid/` contains well-formed, schema-valid documents intended to fail
  exactly the rule named by the file and metadata.
- `malformed/` contains inputs that must fail before schema validation: broken
  XML (`expectation: "malformed"`) and documents a receiver rejects by policy
  (`expectation: "rejected"` — empty, oversized, DOCTYPE/external entities,
  non-UTF-8 encodings, wrong or unsupported root/namespace).
- `schema-invalid/` contains well-formed documents that fail UBL 2.1 XSD
  validation.
- `manifest.json` is the machine-readable index and coverage record.

Every fixture is verified in CI by the internal `@pint-anz/conformance`
harness, which runs the OASIS UBL 2.1 XSD and both official PINT A-NZ
Schematron transforms: valid fixtures must produce zero failed asserts, and
each invalid fixture must fail exactly its declared rule and no others.
Rule-by-rule coverage is tracked in `packages/conformance/coverage.json`
against the full 245-rule inventory. The official validation artefacts are
downloaded and checksum-pinned at build time; they are not part of this
package.

## Usage

```js
import { fixtureUrl, manifest } from "@pint-anz/fixtures";

const invoice = fixtureUrl("invoice-au-standard");
console.log(invoice.pathname, manifest.ruleset.version);
```

Subpath exports are also available, for example
`@pint-anz/fixtures/valid/invoice-au-standard.xml`.

## Adding a fixture

1. Use only the specification-example parties in `parties.md`. Never generate a
   checksum-valid identifier and assume that it is unissued, and never copy a
   real invoice.
2. Make one semantic change per invalid fixture.
3. Add the metadata comment described in the root `CONTRIBUTING.md`.
4. Add exactly one manifest entry and a focused description.
5. Run `pnpm --filter @pint-anz/fixtures test` and, when the validator exists,
   the root fixture integration test.

## Provenance

- Specification: https://docs.peppol.eu/poac/aunz/pint-aunz/
- Official v1.1.2 resources: https://docs.peppol.eu/poac/aunz/pint-aunz/resources.zip

The XML documents here were authored as synthetic examples. They are not copies
of the official sample messages.
