<!-- pint-anz-interpretation
{
  "schemaVersion": 1,
  "ruleId": "aligned-ibr-001-aunz",
  "rulesetVersion": "1.1.2",
  "editorialState": "reviewed",
  "reviewedAt": "2026-07-27",
  "jurisdictions": ["AU"],
  "documentTypes": ["invoice", "credit-note"],
  "affectedTerms": ["Seller country code", "Seller legal identifier", "Seller legal identifier scheme"],
  "officialRuleUrl": "https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/aligned-ibr-001-aunz/",
  "example": {
    "fixtureId": "aligned-ibr-001-aunz-wrong-scheme",
    "patches": [
      {
        "find": "<cbc:CompanyID schemeID=\"0088\">9429033821733</cbc:CompanyID>",
        "replace": "<cbc:CompanyID schemeID=\"0151\">47555222000</cbc:CompanyID>"
      }
    ]
  }
}
-->
# Match an Australian seller identifier to its scheme

## Project interpretation
When the seller address identifies Australia, the legal identifier needs to be an
ABN carried under the ABN scheme. A syntactically valid identifier from another
scheme does not become an ABN merely because it is placed in the seller record.

## Common causes
- A New Zealand party template was reused for an Australian seller.
- The identifier value was changed without changing its scheme.
- Country-specific party data was mapped after a generic identifier block had already been produced.

## Safe fix
Read the seller country and legal registration data from the same verified party
record. For an Australian seller, emit the verified ABN with scheme `0151`, then
validate the complete document again. The fixture values are official published
examples whose provenance and registry-check limits are documented in
`packages/fixtures/parties.md`; do not use them for a live transaction.

## Failing fragment
```xml
<cac:PartyLegalEntity>
  <cbc:CompanyID schemeID="0088">9429033821733</cbc:CompanyID>
</cac:PartyLegalEntity>
```

## Corrected fragment
```xml
<cac:PartyLegalEntity>
  <cbc:CompanyID schemeID="0151">47555222000</cbc:CompanyID>
</cac:PartyLegalEntity>
```

## Official source and copyright
This Project Interpretation is independently authored by the PINT A-NZ Toolkit.
[OpenPeppol's exact rule page](https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/aligned-ibr-001-aunz/)
contains the copyrighted official wording and assertion; neither is reproduced
here.
