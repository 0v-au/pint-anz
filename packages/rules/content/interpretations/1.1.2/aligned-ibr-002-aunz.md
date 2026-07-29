<!-- pint-anz-interpretation
{
  "schemaVersion": 1,
  "ruleId": "aligned-ibr-002-aunz",
  "rulesetVersion": "1.1.2",
  "editorialState": "reviewed",
  "reviewedAt": "2026-07-27",
  "jurisdictions": ["NZ"],
  "documentTypes": ["invoice", "credit-note"],
  "affectedTerms": ["Seller country code", "Seller legal identifier", "Seller legal identifier scheme"],
  "officialRuleUrl": "https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/aligned-ibr-002-aunz/",
  "example": {
    "fixtureId": "aligned-ibr-002-aunz",
    "patches": [
      {
        "find": "<cbc:CompanyID schemeID=\"0002\">9429033821733</cbc:CompanyID>",
        "replace": "<cbc:CompanyID schemeID=\"0088\">9429033821733</cbc:CompanyID>"
      }
    ]
  }
}
-->
# Label a New Zealand seller's NZBN correctly

## Project interpretation
For a seller located in New Zealand, the legal identifier and its scheme must
describe an NZBN consistently. The validator uses the country, identifier value,
and scheme together rather than treating the scheme as optional metadata.

## Common causes
- A local company-number scheme was used where the interoperable NZBN scheme was needed.
- The NZBN value was supplied but a default scheme remained on the XML element.
- Seller country and registration fields came from different source records.

## Safe fix
Confirm the seller's NZBN in the authoritative party data and carry it under
scheme `0088`. Revalidate the complete document after changing the scheme. The
fixture's NZBN is an official published example with provenance and live-use
limits recorded in `packages/fixtures/parties.md`.

## Failing fragment
```xml
<cbc:CompanyID schemeID="0002">9429033821733</cbc:CompanyID>
```

## Corrected fragment
```xml
<cbc:CompanyID schemeID="0088">9429033821733</cbc:CompanyID>
```

## Official source and copyright
This Project Interpretation is independently authored by the PINT A-NZ Toolkit.
[OpenPeppol's exact rule page](https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/aligned-ibr-002-aunz/)
contains the copyrighted official wording and assertion; neither is reproduced
here.
