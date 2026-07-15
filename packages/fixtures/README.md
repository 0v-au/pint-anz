# `@pint-anz/fixtures`

Synthetic UBL 2.1 documents for testing software that supports PINT A-NZ.

The corpus is pinned to the active PINT A-NZ Billing Process **v1.1.2**. The
official specification and downloadable artefacts are the authority; this
package does not silently follow future releases.

## Corpus

- `valid/` contains documents intended to pass schema and business-rule checks.
- `invalid/` contains well-formed documents intended to fail exactly the rule
  named by the file and metadata.
- `malformed/` contains inputs that must fail before business-rule validation.
- `manifest.json` is the machine-readable index and coverage record.

The first release is a representative vertical slice, not complete ruleset
coverage. Business-rule expectations will be verified by a root integration
test once `@pint-anz/lint` is implemented; the package itself deliberately does
not depend on the validator.

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
