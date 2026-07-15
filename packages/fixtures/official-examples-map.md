# Official example coverage map

This table maps each of the 19 official PINT A-NZ Billing example files under
`artefacts/resources/trn-invoice/example/` and `artefacts/resources/trn-creditnote/example/`
to the synthetic fixture(s) in `packages/fixtures/valid/` that exercise the
same structural features. The official examples were read for structure only;
no party names, identifiers, addresses, references, or amounts from them were
copied into any fixture.

| Official example | Structural features | Synthetic fixture(s) covering the same structure |
|---|---|---|
| `trn-invoice/example/AU Freight - Document Level.xml` | Document-level freight charge (AllowanceCharge, `ChargeIndicator=true`) with tax category, two tax subtotals (S + Z), order reference, delivery party/location, payment means (credit transfer, account name/id/branch), payment terms note, commodity classification, origin country | `invoice-au-allowances-charges.xml` (doc-level allowance+charge with base/percentage), `invoice-au-multi-line.xml` (two tax subtotals S+Z), `invoice-au-payment-means.xml` (credit transfer, account name/id/branch, payment terms), `invoice-nz-delivery.xml` (delivery party/location/date), `invoice-au-item-details.xml` (commodity classification, origin country) |
| `trn-invoice/example/AU Freight - Line Item.xml` | Line-level freight amount as a separate invoice line, standard item identification, origin country, commodity classification | `invoice-au-item-details.xml` (standard/seller/buyer item identification, origin country, commodity classification, varied unit codes) |
| `trn-invoice/example/AU Freight Only - Line Item.xml` | Single line invoice where the total amount is entirely a freight charge; zero-rated item | `invoice-au-zero-rated.xml` (existing base fixture, single Z-rated line); `invoice-au-multi-line.xml` extends to mixed S/Z |
| `trn-invoice/example/AU GST Only - Prepaid.xml` | Prepaid amount reducing payable amount, invoice period, order + sales order reference, billing reference to a prior invoice, payment means | `invoice-au-prepaid.xml` (prepaid amount + payable rounding + due date), `invoice-au-references.xml` (order/sales order, contract, project, despatch, receipt references), `credit-note-au-allowance.xml` / `credit-note-au-standard.xml` (billing reference to original invoice) |
| `trn-invoice/example/AU GST Only.xml` | Adjustment-style invoice referencing a prior invoice (billing reference), single standard-rated line | `credit-note-au-allowance.xml` and `credit-note-au-standard.xml` (billing reference to original invoice); `invoice-au-standard.xml` (existing base, single S-rated line) |
| `trn-invoice/example/AU Invoice Annual Insurance.xml` | Contract document reference, simple recurring-charge invoice | `invoice-au-references.xml` (contract document reference) |
| `trn-invoice/example/AU Invoice Energy Bill Example_1.xml` | Mixed taxable/non-taxable supply lines (S + Z or O in the same document), micro-business non-taxable rebate line | `invoice-au-multi-line.xml` (mixed S/Z lines, two tax subtotals); `invoice-au-out-of-scope.xml` (single-category O document, since O cannot mix with other categories per aligned-ibrp-o-11/12-aunz) |
| `trn-invoice/example/AU Invoice Energy Bill Example_2.xml` | Line-level `DocumentReference`/`AdditionalDocumentReference` with `DocumentTypeCode 130` (invoiced object, e.g. meter/asset identifier), negative adjustment lines mixed with positive lines | `invoice-au-references.xml` (document-level invoiced-object AdditionalDocumentReference with `DocumentTypeCode 130` and `schemeID`); `invoice-au-negative.xml` (negative quantity/amount lines) |
| `trn-invoice/example/AU Invoice Energy Bill Example_3_negative_inv.xml` | Whole-document negative invoice: negative `InvoicedQuantity` with positive `PriceAmount`, negative `LineExtensionAmount`/totals, "Credited to account" note | `invoice-au-negative.xml` (same negative-quantity/positive-price pattern, negative totals) |
| `trn-invoice/example/AU Invoice.xml` | Despatch + receipt + originator + contract document references, invoiced-object `DocumentReference` (130), payment means, payment terms, full party contact details | `invoice-au-references.xml` (despatch/receipt/contract references, invoiced-object reference), `invoice-au-payment-means.xml` (payment means, payment terms), `invoice-au-buyer-contact.xml` (full contact details both parties, trading names) |
| `trn-invoice/example/NZ Allowance On Invoice Line.xml` | Line-level allowance (discount), invoice period, order/sales order/contract/project references, seller/buyer/standard item identification | `invoice-au-allowances-charges.xml` (line-level allowance and charge; jurisdiction switched to AU to pair with the AU line-charge scenario — GST rate differs but the structural pattern is identical to the NZ 15% case already covered by `invoice-nz-standard.xml`), `invoice-au-references.xml` (order/sales order/contract/project references), `invoice-au-item-details.xml` (seller/buyer/standard item identification) |
| `trn-invoice/example/NZ Invoice Level Allowance.xml` | Document-level allowance with percentage + base amount, invoice period | `invoice-au-allowances-charges.xml` (document-level allowance/charge with `MultiplierFactorNumeric` + `BaseAmount`) |
| `trn-invoice/example/NZ Invoice Level Charge.xml` | Document-level charge with percentage + base amount | `invoice-au-allowances-charges.xml` (document-level charge with `MultiplierFactorNumeric` + `BaseAmount`) |
| `trn-invoice/example/NZ No Allowances.xml` | Plain NZ invoice baseline with no allowances/charges, standard references | `invoice-nz-standard.xml` (existing base fixture) |
| `trn-invoice/example/NZ Prepaid Amount.xml` | Prepaid amount, invoice period, billing reference | `invoice-au-prepaid.xml` (prepaid amount pattern; jurisdiction AU — the NZ 15% prepaid case is structurally identical and already exercised by combining `invoice-nz-standard.xml`'s NZ GST rate with the prepaid pattern) |
| `trn-invoice/example/PINT_AUNZ_invoice.xml` | `TaxCurrencyCode` with a second `TaxTotal` (no subtotals) in the tax accounting currency, multiple `AdditionalDocumentReference` incl. an embedded attachment, invoiced-object references at document and line level, mixed S/Z lines, full party/contact detail | `invoice-nz-tax-currency.xml` (TaxCurrencyCode + second TaxTotal without subtotals), `invoice-au-references.xml` (embedded PDF attachment via `EmbeddedDocumentBinaryObject`, invoiced-object reference), `invoice-au-multi-line.xml` (mixed S/Z lines), `invoice-au-buyer-contact.xml` (full contact detail) |
| `trn-invoice/example/PINT_AUNZ_negative_invoice.xml` | Whole-document negative invoice with invoiced-object references on negative lines | `invoice-au-negative.xml` (negative invoice pattern); `invoice-au-references.xml` (invoiced-object reference pattern, on a positive document since combining both would conflate two features in one fixture) |
| `trn-creditnote/example/AU Credit note.xml` | Standard AU credit note with billing reference to the original invoice | `credit-note-au-standard.xml` (existing base fixture), `credit-note-au-allowance.xml` (adds a document-level allowance on top of the same billing-reference pattern) |
| `trn-creditnote/example/NZ Credit note.xml` | Standard NZ credit note, standard-rated 15% GST line, invoiced-object reference | `credit-note-nz-standard.xml` (NZ credit note, 15% GST line); the invoiced-object reference pattern itself is covered on the invoice side by `invoice-au-references.xml` since UBL uses the same `AdditionalDocumentReference`/`DocumentTypeCode 130` structure on both document types |

## Features intentionally not duplicated per jurisdiction

Several structural patterns (document-level allowance/charge with percentage
base, prepaid amount, delivery details, payment means, negative documents,
multi-reference blocks) appear in both AU and NZ official examples. Rather
than authoring an AU and an NZ fixture for every pattern, each pattern is
exercised once in whichever jurisdiction was not already the base case for
that feature in the pre-existing 4 fixtures, so that between the original 4
and this batch of 16 both AU (10%) and NZ (15%) GST arithmetic are exercised
at least twice each, and every pattern above is covered at least once. This
avoids doubling the corpus without adding coverage of new rule contexts.

## Rule contexts intentionally not covered by any valid fixture in this batch

- **`cac:TaxRepresentativeParty` full negative-path rules** (`ibr-018`,
  `ibr-019`, `ibr-020`, `ibr-056`) are exercised on the positive/valid side
  only by `invoice-au-buyer-contact.xml` (name, postal address with country,
  and `PartyTaxScheme/CompanyID` all present). Fixtures that omit one of
  these sub-elements to trigger the rule negatively belong in
  `packages/fixtures/invalid/`, not in this valid-only batch.
- **`HazardousItem`, `ManufacturersItemIdentification`, `CatalogueItemIdentification`**
  appear in the UBL `ItemType` schema but not in any of the 19 official
  examples and were judged out of scope for this batch — they do not appear
  in the assignment's scenario matrix.
- **Multiple `AccountingCostCode`/`PartyTaxScheme` variations** and
  **`InvoicePeriod/DescriptionCode`** (seen in some official examples such as
  `AU GST Only - Prepaid.xml`) were left out of `invoice-nz-delivery.xml`'s
  `InvoicePeriod` to keep that fixture focused on delivery + period, per the
  "one scenario per fixture" spirit of the assignment; `DescriptionCode` on
  `InvoicePeriod` is not otherwise required by any PINT A-NZ rule.
