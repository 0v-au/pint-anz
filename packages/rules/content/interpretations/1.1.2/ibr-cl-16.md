<!-- pint-anz-interpretation
{
  "schemaVersion": 1,
  "ruleId": "ibr-cl-16",
  "rulesetVersion": "1.1.2",
  "editorialState": "reviewed",
  "reviewedAt": "2026-07-27",
  "jurisdictions": ["A-NZ"],
  "documentTypes": ["invoice", "credit-note"],
  "affectedTerms": ["Payment means code"],
  "officialRuleUrl": "https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/ibr-cl-16/",
  "example": {
    "fixtureId": "ibr-cl-16",
    "patches": [
      {
        "find": "<cbc:PaymentMeansCode>999</cbc:PaymentMeansCode>",
        "replace": "<cbc:PaymentMeansCode>10</cbc:PaymentMeansCode>"
      }
    ]
  }
}
-->
# Map the payment method to a supported code

## Project interpretation
The payment means value is a code, not a free internal payment-method identifier.
It must come from the supported external list and describe the actual arrangement.

## Common causes
- An ERP's internal numeric payment code was copied directly.
- A display label was converted to an arbitrary number.
- Code-list validation was omitted from the outbound mapping.

## Safe fix
Map the source payment method to the matching supported code. The synthetic
fixture uses `10` for a cash scenario; choose a different code when the real
payment method differs. Add any details required by that method and revalidate
the complete document.

## Failing fragment
```xml
<cbc:PaymentMeansCode>999</cbc:PaymentMeansCode>
```

## Corrected fragment
```xml
<cbc:PaymentMeansCode>10</cbc:PaymentMeansCode>
```

## Official source and copyright
This Project Interpretation is independently authored by the PINT A-NZ Toolkit.
[OpenPeppol's exact rule page](https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/ibr-cl-16/)
contains the copyrighted official wording and assertion; neither is reproduced
here.
