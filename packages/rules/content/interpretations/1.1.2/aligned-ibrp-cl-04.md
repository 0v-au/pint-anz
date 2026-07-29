<!-- pint-anz-interpretation
{
  "schemaVersion": 1,
  "ruleId": "aligned-ibrp-cl-04",
  "rulesetVersion": "1.1.2",
  "editorialState": "reviewed",
  "reviewedAt": "2026-07-27",
  "jurisdictions": ["A-NZ"],
  "documentTypes": ["invoice", "credit-note"],
  "affectedTerms": ["Embedded supporting document media type", "Embedded supporting document filename"],
  "officialRuleUrl": "https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/aligned-ibrp-cl-04/",
  "example": {
    "fixtureId": "aligned-ibrp-cl-04-disallowed-mime-code",
    "patches": [
      {
        "find": "<cbc:EmbeddedDocumentBinaryObject mimeCode=\"application/xml\" filename=\"synthetic-supporting-doc.xml\">PHN5bnRoZXRpYyBzdXBwb3J0aW5nIGRvY3VtZW50Lz4=</cbc:EmbeddedDocumentBinaryObject>",
        "replace": "<cbc:EmbeddedDocumentBinaryObject mimeCode=\"text/csv\" filename=\"synthetic-supporting-doc.csv\">Y29sdW1uCnZhbHVlCg==</cbc:EmbeddedDocumentBinaryObject>"
      }
    ]
  }
}
-->
# Use a supported media type for embedded evidence

## Project interpretation
The A-NZ profile narrows the media types accepted for an embedded supporting
document. The declared media type must describe both an allowed format and the
bytes that were actually encoded.

## Common causes
- An internal XML export was attached directly.
- A filename extension was changed without converting the content.
- A broader UBL media-type list was used instead of the A-NZ subset.

## Safe fix
Convert the supporting material to a supported format, then update its filename,
media type, and base64 payload together. Do not merely relabel unchanged bytes.
The corrected fixture uses a tiny synthetic CSV payload. Revalidate the complete
document and test that the decoded attachment opens as declared.

## Failing fragment
```xml
<cbc:EmbeddedDocumentBinaryObject
  mimeCode="application/xml"
  filename="synthetic-supporting-doc.xml">PHN5bnRoZXRpYyBzdXBwb3J0aW5nIGRvY3VtZW50Lz4=</cbc:EmbeddedDocumentBinaryObject>
```

## Corrected fragment
```xml
<cbc:EmbeddedDocumentBinaryObject
  mimeCode="text/csv"
  filename="synthetic-supporting-doc.csv">Y29sdW1uCnZhbHVlCg==</cbc:EmbeddedDocumentBinaryObject>
```

## Official source and copyright
This Project Interpretation is independently authored by the PINT A-NZ Toolkit.
[OpenPeppol's exact rule page](https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/trn-invoice/rule/aligned-ibrp-cl-04/)
contains the copyrighted official wording and assertion; neither is reproduced
here.
