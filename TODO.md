# Complete PINT A-NZ 1.1.2 fixture coverage

Current baseline: 6 fixtures (4 valid, 1 single-rule invalid, 1 malformed).
The official invoice Schematrons contain 245 unique assertions: 171 shared PINT
rules and 74 A-NZ aligned rules. Only `aligned-ibr-001-aunz` currently has a
negative fixture.

## 1. Build the coverage harness

- [ ] Generate a versioned rule inventory from both official Schematrons.
- [ ] Track each rule as `valid-covered`, `invalid-covered`, `not-applicable`, or
  `blocked`, with fixture IDs and justification.
- [ ] Run UBL 2.1 XSD validation and both official Schematron transforms in CI.
- [ ] Assert that every invalid fixture fails exactly its declared rule and no
  others.
- [ ] Fail CI when the manifest, corpus, rule inventory, or pinned artefact
  checksums drift.
- [ ] Keep official artefacts out of the published package unless redistribution
  permission is confirmed.

## 2. Complete the valid scenario matrix

- [ ] Cover invoice and credit note for both AU and NZ.
- [ ] Cover tax categories `S`, `Z`, `E`, `G`, and `O` where applicable.
- [ ] Cover multiple lines, multiple tax rates, allowances, charges, discounts,
  prepaid amounts, rounding, and negative invoices.
- [ ] Cover payment methods, account details, payment terms, attachments, and
  document/order/project/contract references.
- [ ] Cover identifiers, addresses, contacts, delivery, periods, item identifiers,
  price base quantities, and units of measure.
- [ ] Map all 19 official examples to equivalent synthetic coverage without
  copying restricted content.

## 3. Complete negative business-rule coverage

- [ ] Required terms and cardinality rules.
- [ ] AU ABN and NZ NZBN jurisdiction rules for seller and buyer.
- [ ] Profile, customization, and the 1.1.2 wildcard rule `IBR-SR-63`.
- [ ] Totals, tax calculations, line calculations, allowances, charges, prices,
  percentages, currency consistency, dates, and rounding.
- [ ] Tax-category-specific rules for `S`, `Z`, `E`, `G`, and `O`.
- [ ] Payment, reference, attachment, identifier, and document-type rules.
- [ ] Record justified exceptions where a rule cannot be isolated because XSD or
  another rule necessarily fails first.

## 4. Complete code-list coverage

- [ ] Inventory all 15 bundled code lists and their consuming XML locations.
- [ ] Add representative accepted values and one rejected value per consuming
  context.
- [ ] Add boundary cases for EAS, ICD, ISO 3166, ISO 4217, MIME, UNCL document,
  payment, allowance/charge, item, tax, and unit codes.
- [ ] Explicitly test the code-list additions and removals made in 1.1.2.

## 5. Complete parser and schema coverage

- [ ] Add well-formed but UBL-schema-invalid invoice and credit-note fixtures.
- [ ] Add truncated XML, wrong root/namespace, entity/DOCTYPE, encoding, empty,
  oversized, and unsupported-document cases.
- [ ] Verify safe parser behaviour, including disabled external entities.

## 6. Release gate

- [ ] Every one of the 245 rules has a reviewed coverage status.
- [ ] Every independently triggerable rule has a single-rule negative fixture.
- [ ] All valid fixtures pass XSD and both Schematrons offline.
- [ ] All invalid and malformed expectations are enforced automatically.
- [ ] Documentation reports generated coverage totals and known exceptions.
- [ ] Packed-package tests pass using only files included in the tarball.
