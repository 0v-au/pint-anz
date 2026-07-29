<!-- pint-anz-interpretation
{
  "schemaVersion": 1,
  "ruleId": "aligned-ibrp-053",
  "rulesetVersion": "1.1.2",
  "editorialState": "reviewed",
  "reviewedAt": "2026-07-27",
  "jurisdictions": ["A-NZ"],
  "documentTypes": ["invoice", "credit-note"],
  "affectedTerms": ["Invoice line quantity", "Invoice line net amount", "Item net price", "Item price base quantity", "Invoice line charge amount", "Invoice line allowance amount"],
  "officialRuleUrl": "https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/aligned-ibrp-053/",
  "example": {
    "fixtureId": "aligned-ibrp-053",
    "patches": [
      {
        "find": "<cbc:PriceAmount currencyID=\"AUD\">40.00</cbc:PriceAmount>",
        "replace": "<cbc:PriceAmount currencyID=\"AUD\">50.00</cbc:PriceAmount>"
      }
    ]
  }
}
-->
# Reconcile quantity, price, and line net amount

## Project interpretation
The line's stated net amount needs to reconcile its priced quantity and any
line-level adjustments. Start with quantity multiplied by the unit price after
allowing for a price base quantity, add line charges, and subtract line
allowances. Changing document totals to match a wrong line amount does not repair
the line calculation.

## Common causes
- A unit price was rounded or converted independently from the line total.
- The source quantity changed after the total was calculated.
- A price base quantity was ignored by the mapping.
- A line allowance or charge was included in the XML but omitted from the line-net calculation.

## Safe fix
Recalculate from the authoritative line inputs, keeping currency precision and
the price base quantity consistent. Include each line charge as an addition and
each line allowance as a subtraction exactly once. This minimal fixture has no
line adjustments, so two units at `50.00` produce the stated `100.00` line net
amount. Revalidate all totals after the correction.

## Failing fragment
```xml
<cbc:InvoicedQuantity unitCode="EA">2</cbc:InvoicedQuantity>
<cbc:LineExtensionAmount currencyID="AUD">100.00</cbc:LineExtensionAmount>
<cac:Price>
  <cbc:PriceAmount currencyID="AUD">40.00</cbc:PriceAmount>
</cac:Price>
```

## Corrected fragment
```xml
<cbc:InvoicedQuantity unitCode="EA">2</cbc:InvoicedQuantity>
<cbc:LineExtensionAmount currencyID="AUD">100.00</cbc:LineExtensionAmount>
<cac:Price>
  <cbc:PriceAmount currencyID="AUD">50.00</cbc:PriceAmount>
</cac:Price>
```

## Official source and copyright
This Project Interpretation is independently authored by the PINT A-NZ Toolkit.
[OpenPeppol's exact rule page](https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/aligned-ibrp-053/)
contains the copyrighted official wording and assertion; neither is reproduced
here.
