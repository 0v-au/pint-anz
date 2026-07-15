# Synthetic test parties

These checksum-valid identifiers come from the official PINT A-NZ Billing
examples. As of 15 July 2026, the ABNs return "ABN not found" in ABN Lookup and
the NZBNs return no matches in the NZBN Register. They are examples, not a
formally reserved test range: do not use them in production, register them, or
send them over a live Peppol network.

| Fixture party | Jurisdiction | Identifier scheme | Identifier | Purpose |
|---|---|---|---|---|
| Example AU Supplier | AU | `0151` (ABN) | `47555222000` | Seller |
| Example AU Buyer | AU | `0151` (ABN) | `91888222000` | Buyer |
| Example NZ Supplier | NZ | `0088` (GLN/NZBN) | `9429033821733` | Seller |
| Example NZ Buyer | NZ | `0088` (GLN/NZBN) | `9429033591476` | Buyer |

Names, addresses, document references, and monetary values in this package are
also invented. Email addresses, when needed by future fixtures, must use the
IANA-reserved `example` domains.

## Checksums

The package tests verify the Australian Business Number weighted modulus-89
checksum and the GS1 check digit used by the 13-digit New Zealand identifiers.
Checksum validity only makes a fixture syntactically realistic; it does not
prove that an identifier is unissued, reserved for testing, or safe for network
use.

Sources:

- PINT A-NZ Billing examples: https://docs.peppol.eu/poac/aunz/pint-aunz/bis/
- ABN Lookup: https://abr.business.gov.au/
- NZBN Register: https://www.nzbn.govt.nz/
