# Prompt: build `@pint-anz/mapper`

You are implementing `packages/mapper` in the PINT A-NZ Toolkit monorepo. Read
the root documentation, inspect the fixtures and lint API, and preserve unrelated
changes.

## Goal

Provide a small, typed JSON input model that deterministically compiles common AU
and NZ invoice and credit-note cases into compliant PINT A-NZ UBL 2.1 XML.

## Requirements

- Start from explicit use cases represented by valid fixtures. Define the
  smallest honest domain model; do not reproduce the entire UBL schema in JSON.
- Model jurisdiction, document type, supplier/customer identifiers, addresses,
  currency, dates, references, payment information, line quantities/prices,
  allowances/charges, tax categories/rates, totals, and rounding deliberately.
- Use a decimal-safe strategy for money and tax calculations. State ownership of
  derived totals and reject conflicting caller-supplied values.
- Expose typed APIs for validation and mapping. Return structured input problems;
  do not emit plausible XML from ambiguous or incomplete data.
- Emit deterministic, namespace-correct, safely escaped UBL with a documented
  element order. Keep XML generation independent of network access.
- Pin the supported PINT A-NZ ruleset version. Validate generated XML with
  `@pint-anz/lint` in integration tests and use valid fixtures as golden examples
  where exact output is part of the contract.
- Cover AU and NZ invoices, credit notes, GST/GST-free or zero-rated cases as
  applicable, discounts/charges, rounding edges, Unicode, XML metacharacters,
  and invalid identifiers/input.
- Document the JSON schema, examples, assumptions, unsupported UBL features,
  error model, and ruleset upgrade process.

## Non-goals

Do not accept arbitrary UBL pass-through fields, perform accounting or tax
advice, look up participant capability, send documents, or claim every valid
PINT A-NZ document can round-trip through the minimal model.

## Done when

The package builds, tests, and packs cleanly; generated documents for supported
examples pass the pinned validator; money/property tests cover rounding
invariants; invalid input fails clearly; output is deterministic; and documented
limitations match tested behaviour. Report commands run and unsupported cases.
