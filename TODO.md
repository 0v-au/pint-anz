# Complete PINT A-NZ 1.1.2 fixture coverage

**Status: complete.** The corpus now holds 214 fixtures (21 valid, 180
single-rule invalid, 2 malformed, 6 rejected, 5 schema-invalid). All 245
official assertions (171 shared PINT + 74 A-NZ aligned) have a reviewed
status in
`packages/conformance/coverage.json`: 180 invalid-covered, 63 blocked with
observed justifications, 2 not-applicable. See
`packages/conformance/COVERAGE.md` for the generated report and
`packages/conformance/CODELISTS.md` for the code-list inventory.

## 1. Build the coverage harness

- [x] Generate a versioned rule inventory from both official Schematrons.
- [x] Track each rule as `valid-covered`, `invalid-covered`, `not-applicable`, or
  `blocked`, with fixture IDs and justification.
- [x] Run UBL 2.1 XSD validation and both official Schematron transforms in CI.
- [x] Assert that every invalid fixture fails exactly its declared rule and no
  others.
- [x] Fail CI when the manifest, corpus, rule inventory, or pinned artefact
  checksums drift.
- [x] Keep official artefacts out of the published package unless redistribution
  permission is confirmed.

## 2. Complete the valid scenario matrix

- [x] Cover invoice and credit note for both AU and NZ.
- [x] Cover tax categories `S`, `Z`, `E`, `G`, and `O` where applicable.
- [x] Cover multiple lines, multiple tax rates, allowances, charges, discounts,
  prepaid amounts, rounding, and negative invoices.
- [x] Cover payment methods, account details, payment terms, attachments, and
  document/order/project/contract references.
- [x] Cover identifiers, addresses, contacts, delivery, periods, item identifiers,
  price base quantities, and units of measure.
- [x] Map all 19 official examples to equivalent synthetic coverage without
  copying restricted content.

## 3. Complete negative business-rule coverage

- [x] Required terms and cardinality rules.
- [x] AU ABN and NZ NZBN jurisdiction rules for seller and buyer.
- [x] Profile, customization, and the 1.1.2 wildcard rule `IBR-SR-63`.
- [x] Totals, tax calculations, line calculations, allowances, charges, prices,
  percentages, currency consistency, dates, and rounding.
- [x] Tax-category-specific rules for `S`, `Z`, `E`, `G`, and `O`.
- [x] Payment, reference, attachment, identifier, and document-type rules.
- [x] Record justified exceptions where a rule cannot be isolated because XSD or
  another rule necessarily fails first.

## 4. Complete code-list coverage

- [x] Inventory all 15 bundled code lists and their consuming XML locations.
- [x] Add representative accepted values and one rejected value per consuming
  context.
- [x] Add boundary cases for EAS, ICD, ISO 3166, ISO 4217, MIME, UNCL document,
  payment, allowance/charge, item, tax, and unit codes.
- [x] Explicitly test the code-list additions and removals made in 1.1.2.

## 5. Complete parser and schema coverage

- [x] Add well-formed but UBL-schema-invalid invoice and credit-note fixtures.
- [x] Add truncated XML, wrong root/namespace, entity/DOCTYPE, encoding, empty,
  oversized, and unsupported-document cases.
- [x] Verify safe parser behaviour, including disabled external entities.

## 6. Release gate

- [x] Every one of the 245 rules has a reviewed coverage status.
- [x] Every independently triggerable rule has a single-rule negative fixture.
- [x] All valid fixtures pass XSD and both Schematrons offline.
- [x] All invalid and malformed expectations are enforced automatically.
- [x] Documentation reports generated coverage totals and known exceptions.
- [x] Packed-package tests pass using only files included in the tarball.
