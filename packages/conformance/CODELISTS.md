# Bundled code lists (PINT A-NZ 1.1.2)

The official `resources.zip` bundles 15 genericode lists per document type
(invoice and credit note differ only in `UNCL1001-inv.gc` vs `UNCL1001-cn.gc`).
This inventory maps each list to the Schematron rules that consume it and the
XML locations they fire on. Counts and versions were read from the pinned
artefacts (see `artefacts.lock.json`).

| Code list | Version | Codes | Enforcing rule(s) | Consuming XML locations |
|---|---|---|---|---|
| `Aligned-TaxCategoryCodes.gc` (UNCL5305 subset: S, Z, E, G, O) | D.16B | 5 | `aligned-ibrp-cl-01-aunz` | `cac:TaxCategory/cbc:ID`, `cac:ClassifiedTaxCategory/cbc:ID` (ibt-095, ibt-102, ibt-118, ibt-151, ibt-192) |
| `ICD.gc` (ISO 6523 ICD) | 20210630 | 239 | `ibr-cl-10`, `ibr-cl-11`, `ibr-cl-21`, `ibr-cl-26` | `cac:PartyIdentification/cbc:ID/@schemeID`, `cac:PartyLegalEntity/cbc:CompanyID/@schemeID`, `cac:StandardItemIdentification/cbc:ID/@schemeID`, `cac:DeliveryLocation/cbc:ID/@schemeID` |
| `ISO3166.gc` (country codes) | 2013 | 251 | `ibr-cl-14`, `ibr-cl-15` | `cac:Country/cbc:IdentificationCode`, `cac:OriginCountry/cbc:IdentificationCode` |
| `ISO4217.gc` (currency codes) | 2015 | 178 | `ibr-cl-03`, `ibr-cl-04`, `ibr-cl-05` | `@currencyID` on every amount, `cbc:DocumentCurrencyCode`, `cbc:TaxCurrencyCode` |
| `MimeCode.gc` (IANA media type subset) | 20210921 | 6 | `ibr-cl-24`, `aligned-ibrp-cl-04` | `cbc:EmbeddedDocumentBinaryObject/@mimeCode` |
| `SEPA.gc` (SEPA indicator) | 1.0 | 1 | — (EU-only; no A-NZ rule consumes it) | not reachable in PINT A-NZ documents |
| `UNCL1001-inv.gc` / `UNCL1001-cn.gc` (document name code) | D.17A | 25 / — | `ibr-cl-01` | `cbc:InvoiceTypeCode`, `cbc:CreditNoteTypeCode` |
| `UNCL1153.gc` (invoiced object identifier scheme) | D.16B | 818 | `ibr-cl-07` | `cac:AdditionalDocumentReference[cbc:DocumentTypeCode='130']/cbc:ID/@schemeID`, line `cac:DocumentReference[...]/cbc:ID/@schemeID` |
| `UNCL2005.gc` (date/period function qualifier) | D.16B | 3 | `aligned-ibrp-cl-02` | `cac:InvoicePeriod/cbc:DescriptionCode` (tax point date code) |
| `UNCL4461.gc` (payment means code) | D.16B | 91 | `ibr-cl-16` | `cac:PaymentMeans/cbc:PaymentMeansCode` |
| `UNCL5189.gc` (allowance reason code) | D.16B | 19 | `ibr-cl-19` | `cac:AllowanceCharge[ChargeIndicator=false]/cbc:AllowanceChargeReasonCode` |
| `UNCL7143.gc` (item type identification code) | D.19A | 185 | `ibr-cl-13` | `cac:CommodityClassification/cbc:ItemClassificationCode/@listID` |
| `UNCL7161.gc` (charge reason code) | D.16B | 178 | `ibr-cl-20` | `cac:AllowanceCharge[ChargeIndicator=true]/cbc:AllowanceChargeReasonCode` |
| `UNECERec20.gc` (units of measure, Rec 20 + Rec 21 X-prefixed) | 11e | 2162 | `ibr-cl-23` | `cbc:InvoicedQuantity/@unitCode`, `cbc:BaseQuantity/@unitCode`, `cbc:CreditedQuantity/@unitCode` |
| `eas.gc` (electronic address scheme) | 2020-11 | 86 | `ibr-cl-25` | `cbc:EndpointID/@schemeID` |

`SEPA.gc` ships in the bundle but no rule in either A-NZ Schematron references
it; it is tracked as not-consumable for coverage purposes.

## Code-list changes in 1.1.2 (from the official release notes)

| List | Change | Corpus coverage |
|---|---|---|
| ICD | Added `0241`, `0242`, `0243`, `0244` | accepted-value fixture uses an added ICD on a party identifier |
| EAS | Added `0244` | accepted-value fixture uses `0244` as an endpoint scheme |
| ISO 3166 | Updated `BS` entry (still present) | `BS` accepted as an origin-country code |
| ISO 4217 | Added `CNH`; removed `CUC` | `CNH` accepted by the additions fixture. Independent validator experiments found the removal rules inseparable from currency-consistency results; the related identities and blocked state are recorded in `coverage.json`. |

The other 1.1.2 change is the new wildcard rule `IBR-SR-63`
(`cbc:CustomizationID` must not contain `*`), which has its own negative
fixture tracked in `coverage.json`.
