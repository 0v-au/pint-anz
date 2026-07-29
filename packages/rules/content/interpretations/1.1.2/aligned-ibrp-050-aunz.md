<!-- pint-anz-interpretation
{
  "schemaVersion": 1,
  "ruleId": "aligned-ibrp-050-aunz",
  "rulesetVersion": "1.1.2",
  "editorialState": "reviewed",
  "reviewedAt": "2026-07-27",
  "jurisdictions": ["A-NZ"],
  "documentTypes": ["invoice", "credit-note"],
  "affectedTerms": ["Invoice line tax category code", "Invoice line tax rate", "Invoice line tax scheme"],
  "officialRuleUrl": "https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/aligned-ibrp-050-aunz/",
  "example": {
    "fixtureId": "aligned-ibrp-050-aunz",
    "patches": [
      {
        "find": "<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>",
        "replace": "<cac:TaxScheme><cbc:ID>GST</cbc:ID></cac:TaxScheme>"
      }
    ]
  }
}
-->
# Keep line tax classification under GST

## Project interpretation
An A-NZ line tax classification is interpreted within the GST tax scheme. A
category and percentage attached to a different scheme do not form the expected
line GST classification.

## Common causes
- A European invoice template supplied `VAT` as a global default.
- Tax scheme and category were populated from different tax engines.
- A label intended for display was reused as the scheme code.

## Safe fix
Map the line's tax decision as one coherent set: category, rate where applicable,
and scheme. Use `GST` only when that reflects the source transaction and relevant
authoritative requirements; this validation result is not tax advice. Revalidate
the entire document because the category must also agree with its tax breakdown.

## Failing fragment
```xml
<cac:ClassifiedTaxCategory>
  <cbc:ID>S</cbc:ID>
  <cbc:Percent>10</cbc:Percent>
  <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
</cac:ClassifiedTaxCategory>
```

## Corrected fragment
```xml
<cac:ClassifiedTaxCategory>
  <cbc:ID>S</cbc:ID>
  <cbc:Percent>10</cbc:Percent>
  <cac:TaxScheme><cbc:ID>GST</cbc:ID></cac:TaxScheme>
</cac:ClassifiedTaxCategory>
```

## Official source and copyright
This Project Interpretation is independently authored by the PINT A-NZ Toolkit.
[OpenPeppol's exact rule page](https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/aligned-ibrp-050-aunz/)
contains the copyrighted official wording and assertion; neither is reproduced
here.
