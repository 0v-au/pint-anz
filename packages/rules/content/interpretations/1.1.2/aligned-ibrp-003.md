<!-- pint-anz-interpretation
{
  "schemaVersion": 1,
  "ruleId": "aligned-ibrp-003",
  "rulesetVersion": "1.1.2",
  "editorialState": "reviewed",
  "reviewedAt": "2026-07-27",
  "jurisdictions": ["A-NZ"],
  "documentTypes": ["invoice", "credit-note"],
  "affectedTerms": ["Buyer reference", "Purchase order reference"],
  "officialRuleUrl": "https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/aligned-ibrp-003/",
  "example": {
    "fixtureId": "aligned-ibrp-003",
    "patches": [
      {
        "find": "  <cbc:DocumentCurrencyCode>AUD</cbc:DocumentCurrencyCode>\n  <cac:AccountingSupplierParty>",
        "replace": "  <cbc:DocumentCurrencyCode>AUD</cbc:DocumentCurrencyCode>\n  <cbc:BuyerReference>BUYER-ROUTING-001</cbc:BuyerReference>\n  <cac:AccountingSupplierParty>"
      }
    ]
  }
}
-->
# Give the buyer a routing reference

## Project interpretation
The document needs at least one buyer-facing reference that can connect it to the
buyer's process. A buyer reference can provide that routing key when there is no
purchase order reference.

## Common causes
- A non-order invoice was generated with the order block omitted and no alternative buyer reference.
- A reference exists in the source system but was mapped only into free text.
- Empty reference values were removed during XML cleanup.

## Safe fix
Use a real reference supplied or agreed by the buyer. Put it in either the buyer
reference or purchase order reference location as appropriate; do not invent an
order number merely to pass validation. Revalidate the whole document.

## Failing fragment
```xml
<cbc:DocumentCurrencyCode>AUD</cbc:DocumentCurrencyCode>
<cac:AccountingSupplierParty>...</cac:AccountingSupplierParty>
```

## Corrected fragment
```xml
<cbc:DocumentCurrencyCode>AUD</cbc:DocumentCurrencyCode>
<cbc:BuyerReference>BUYER-ROUTING-001</cbc:BuyerReference>
<cac:AccountingSupplierParty>...</cac:AccountingSupplierParty>
```

## Official source and copyright
This Project Interpretation is independently authored by the PINT A-NZ Toolkit.
[OpenPeppol's exact rule page](https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/aligned-ibrp-003/)
contains the copyrighted official wording and assertion; neither is reproduced
here.
