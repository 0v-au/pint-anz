# Authoring corpus fixtures

Working notes for adding fixtures to `packages/fixtures`. Read together with
the root `CONTRIBUTING.md` and `packages/fixtures/parties.md`.

Provision the gitignored official inputs explicitly before building or testing:

```bash
pnpm --filter @pint-anz/conformance artefacts
```

Build, test, and release commands verify this local input set and fail if it is
missing or drifted; they never download it implicitly.

## The loop

1. Write the XML under `packages/fixtures/{valid,invalid,malformed,schema-invalid}/`.
2. Validate it against the real official pipeline:

   ```bash
   node packages/conformance/scripts/validate-cli.mjs packages/fixtures/invalid/<file>.xml
   ```

3. Iterate until the output matches the fixture's expectation exactly:
   - `valid` → `stage: rules`, `schematron: clean (0 failed asserts)`
   - `invalid` → `stage: rules` and **only** the declared rule id fires (any
     number of times, but no other id from either ruleset)
   - `schema-invalid` → `stage: schema-invalid`
   - `malformed` → `stage: malformed` (fails XML parsing)
   - `rejected` → `stage: rejected` (stopped by receiver preflight: empty,
     oversized > 100 KiB, DOCTYPE, non-UTF-8 declared encoding, wrong or
     unsupported root/namespace)
4. Record the fixture in your batch report (below). Do **not** edit
   `manifest.json` or `coverage.json` directly — reports are merged centrally.

## Rules for every fixture

- **Parties**: only the four synthetic parties in `packages/fixtures/parties.md`.
  Never invent identifiers (ABN, NZBN, GLN, bank accounts); never copy from the
  official examples in `artefacts/resources/*/example/` — read them for
  *structure*, then write your own synthetic content (different names, numbers,
  amounts, items).
- **Document ID**: the document-level `<cbc:ID>` must equal the fixture id
  (e.g. `<cbc:ID>ibr-010-missing-currency</cbc:ID>`) so IDs stay unique.
- **Metadata comment** immediately after the XML declaration, exactly:

  ```xml
  <!--
    fixture: <fixture-id>
    expects: VALID | ERROR <rule-id> | MALFORMED XML | SCHEMA-INVALID | REJECTED
    ruleset: 1.1.2
    notes: <one line: what this covers / what single change makes it fail>
  -->
  ```

- **Naming**: invalid fixtures are `invalid/<rule-id>.xml`, or
  `invalid/<rule-id>.<variant>.xml` for multiple variants. The manifest fixture
  id is the filename with dots turned into dashes and no `.xml`
  (`ibr-cl-25.wrong-scheme.xml` → `ibr-cl-25-wrong-scheme`).
- **One semantic change** per invalid fixture, starting from a known-valid
  base (copy one of `valid/*.xml`), so it fails only for the named reason.
- **CustomizationID** `urn:peppol:pint:billing-1@aunz-1` and **ProfileID**
  `urn:peppol:bis:billing` unless the rule under test is about them.
- Keep GST arithmetic consistent (AU standard rate 10%, NZ 15%) unless the
  rule under test is a calculation rule.
- Email addresses use `example.com`/`example.org`; every name, address,
  reference, and amount is invented.

## Rule projection and local rule source

`packages/conformance/rule-inventory.json` holds the rights-safe identities,
families, severities, and provenance for all 245 rules. It deliberately excludes
official messages and expressions. Run the artefact fetch, verify the pinned
checksums, and inspect the exact rule only in the local, gitignored Schematron
source while authoring a fixture.

## Coverage statuses

Each rule you are assigned ends in exactly one state:

- `invalid-covered` — you produced ≥1 single-rule negative fixture.
- `valid-covered` — no isolated negative is possible, but a valid fixture
  exercises the relevant scenario. Requires an independently worded observation.
- `blocked` — UBL 2.1 XSD, transformation failure, or another rule result
  prevents isolation. Requires an independently worded observation naming the
  observed blocker by identity only.
- `not-applicable` — the rule cannot fire for any PINT A-NZ corpus document.
  Requires an independently worded observation.

Prefer `invalid-covered`; claim `blocked`/`not-applicable` only after actually
trying and observing the blocker in validator output.

## Batch report

Write one JSON file per batch to the path you were given:

```json
{
  "fixtures": [
    {
      "id": "ibr-010-missing-currency",
      "path": "./invalid/ibr-010.missing-currency.xml",
      "documentType": "invoice",
      "jurisdiction": "AU",
      "expectation": "invalid",
      "expectedRules": ["ibr-010"],
      "rulesetVersion": "1.1.2",
      "description": "Invoice without a document currency code."
    }
  ],
  "coverage": {
    "ibr-010": { "status": "invalid-covered", "fixtures": ["ibr-010-missing-currency"], "observation": "" }
  }
}
```

`documentType` is `invoice`, `credit-note`, or `unknown`; `jurisdiction` is
`AU`, `NZ`, or `A-NZ`. Valid fixtures use `"expectation": "valid"` and
`"expectedRules": []`.

Merge is run centrally with:

```bash
node packages/conformance/scripts/merge-batch.mjs <report.json...>
```
