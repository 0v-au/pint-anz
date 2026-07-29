<!-- pint-anz-interpretation
{
  "schemaVersion": 1,
  "ruleId": "aligned-ibrp-018",
  "rulesetVersion": "1.1.2",
  "editorialState": "reviewed",
  "reviewedAt": "2026-07-27",
  "jurisdictions": ["A-NZ"],
  "documentTypes": ["invoice", "credit-note"],
  "affectedTerms": ["Payment means code", "Payee financial account identifier"],
  "officialRuleUrl": "https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/aligned-ibrp-018/",
  "example": {
    "fixtureId": "aligned-ibrp-018",
    "patches": [
      {
        "find": "    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>\n  </cac:PaymentMeans>",
        "replace": "    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>\n    <cac:PayeeFinancialAccount>\n      <cbc:ID>SYNTHETIC-ACCOUNT-001</cbc:ID>\n    </cac:PayeeFinancialAccount>\n  </cac:PaymentMeans>"
      }
    ]
  }
}
-->
# Include the destination account for a credit transfer

## Project interpretation
Selecting credit transfer as the payment method is not enough to tell the payer
where funds should go. The payment block also needs the payee account identifier
used for that transfer.

## Common causes
- Payment method and bank details were mapped by separate integrations.
- Account data was suppressed while the credit-transfer code remained.
- A payment block was copied from a non-bank payment flow.

## Safe fix
If credit transfer is the intended method, add the payee's verified account
identifier in the financial account block. Otherwise select the payment method
that describes the real arrangement. Never fabricate account details, and
revalidate the complete document.

## Failing fragment
```xml
<cac:PaymentMeans>
  <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
</cac:PaymentMeans>
```

## Corrected fragment
```xml
<cac:PaymentMeans>
  <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
  <cac:PayeeFinancialAccount>
    <cbc:ID>SYNTHETIC-ACCOUNT-001</cbc:ID>
  </cac:PayeeFinancialAccount>
</cac:PaymentMeans>
```

## Official source and copyright
This Project Interpretation is independently authored by the PINT A-NZ Toolkit.
[OpenPeppol's exact rule page](https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/aligned-ibrp-018/)
contains the copyrighted official wording and assertion; neither is reproduced
here.
