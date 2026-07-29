# Initial Project Interpretation selection

The 1.1.2 launch tranche contains 15 reviewed, fixture-backed Project
Interpretations. It is deliberately bounded: the aim is to prove a useful
editorial and validation workflow before expanding coverage.

## Selection criteria

- Prefer failures that commonly block document exchange or explain a major UBL
  implementation area.
- Include both the shared PINT and A-NZ-aligned rule sources.
- Include direct fixture evidence from Australia and New Zealand, and from an
  invoice and a credit note.
- Cover identifiers, parties and addresses, references, payment, dates,
  codelists, attachments, tax, invoice lines, allowances and charges, and
  amounts and totals.
- Select only isolated `invalid-covered` fixtures whose complete corrected
  document passes the checksum-pinned 1.1.2 validator.
- Avoid repeating several near-identical members of one rule family in this
  first tranche.

The selected identities are recorded in the generated gap report rather than
duplicated here.

## Known gaps

Most fixture-backed identities still have no Project Interpretation. Some rule
identities have no isolated negative fixture because another rule necessarily
co-fires, an earlier schema check prevents the required document state, or the
pinned transform cannot exercise the condition independently. The generated
`interpretation-gaps.generated.json` lists each remaining identity by evidence
state.

The launch set is evidence-balanced, not a claim about which failures are most
frequent in production. T015 will use observed search queries, correction
requests, and conformance gaps to select the next bounded tranche.
