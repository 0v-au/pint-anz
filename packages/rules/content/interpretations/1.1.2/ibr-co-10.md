<!-- pint-anz-interpretation
{
  "schemaVersion": 1,
  "ruleId": "ibr-co-10",
  "rulesetVersion": "1.1.2",
  "editorialState": "reviewed",
  "reviewedAt": "2026-07-27",
  "jurisdictions": ["A-NZ"],
  "documentTypes": ["invoice", "credit-note"],
  "affectedTerms": ["Invoice line net amount", "Sum of invoice line net amounts", "Tax-exclusive amount", "Tax-inclusive amount", "Amount due"],
  "officialRuleUrl": "https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/ibr-co-10/",
  "example": {
    "fixtureId": "ibr-co-10-line-sum-mismatch",
    "patches": [
      {
        "find": "    <cbc:LineExtensionAmount currencyID=\"AUD\">105.00</cbc:LineExtensionAmount>\n    <cbc:TaxExclusiveAmount currencyID=\"AUD\">105.00</cbc:TaxExclusiveAmount>\n    <cbc:TaxInclusiveAmount currencyID=\"AUD\">115.00</cbc:TaxInclusiveAmount>\n    <cbc:PayableAmount currencyID=\"AUD\">115.00</cbc:PayableAmount>",
        "replace": "    <cbc:LineExtensionAmount currencyID=\"AUD\">100.00</cbc:LineExtensionAmount>\n    <cbc:TaxExclusiveAmount currencyID=\"AUD\">100.00</cbc:TaxExclusiveAmount>\n    <cbc:TaxInclusiveAmount currencyID=\"AUD\">110.00</cbc:TaxInclusiveAmount>\n    <cbc:PayableAmount currencyID=\"AUD\">110.00</cbc:PayableAmount>"
      }
    ]
  }
}
-->
# Rebuild totals from the lines

## Project interpretation
The document's line-net total is a roll-up of the individual line net amounts.
Compensating other totals to agree with an incorrect roll-up may hide additional
errors, but it does not make the roll-up correct.

## Common causes
- A deleted or filtered line remained in a cached header total.
- Header totals and lines were rounded or converted in separate operations.
- A manual total override bypassed recalculation.

## Safe fix
Recompute the line-net total from the final serialized lines, then recalculate the
dependent tax-exclusive, tax-inclusive, and payable values from their own source
terms. The synthetic fixture has one `100.00` line and is corrected consistently.
Revalidate the complete totals chain.

## Failing fragment
```xml
<cac:LegalMonetaryTotal>
  <cbc:LineExtensionAmount currencyID="AUD">105.00</cbc:LineExtensionAmount>
  <cbc:TaxExclusiveAmount currencyID="AUD">105.00</cbc:TaxExclusiveAmount>
  <cbc:TaxInclusiveAmount currencyID="AUD">115.00</cbc:TaxInclusiveAmount>
  <cbc:PayableAmount currencyID="AUD">115.00</cbc:PayableAmount>
</cac:LegalMonetaryTotal>
```

## Corrected fragment
```xml
<cac:LegalMonetaryTotal>
  <cbc:LineExtensionAmount currencyID="AUD">100.00</cbc:LineExtensionAmount>
  <cbc:TaxExclusiveAmount currencyID="AUD">100.00</cbc:TaxExclusiveAmount>
  <cbc:TaxInclusiveAmount currencyID="AUD">110.00</cbc:TaxInclusiveAmount>
  <cbc:PayableAmount currencyID="AUD">110.00</cbc:PayableAmount>
</cac:LegalMonetaryTotal>
```

## Official source and copyright
This Project Interpretation is independently authored by the PINT A-NZ Toolkit.
[OpenPeppol's exact rule page](https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/ibr-co-10/)
contains the copyrighted official wording and assertion; neither is reproduced
here.
