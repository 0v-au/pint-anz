# Prompt: build `@pint-anz/lookup`

You are implementing `packages/lookup` in the PINT A-NZ Toolkit monorepo. Read
the root documentation, inspect the worktree, and preserve unrelated changes.
Research the currently supported, authoritative Peppol discovery mechanisms and
their acceptable-use constraints before selecting providers.

## Goal

Provide a typed library and CLI that answers whether an ABN- or NZBN-identified
participant can be discovered on Peppol and which relevant PINT A-NZ document
processes it advertises, without overstating what discovery proves.

## Requirements

- Separate identifier parsing/normalisation, participant ID construction,
  discovery transport, signed/authoritative response interpretation where
  applicable, capability mapping, caching, and presentation.
- Validate ABN/NZBN format and checksum locally, while allowing an explicit full
  Peppol participant identifier for advanced use. Preserve leading zeroes.
- Define precise result states such as capable, participant found but requested
  capability absent, not found, temporarily unavailable, invalid input, and
  indeterminate. Never equate directory absence with a business not existing.
- Return evidence with source/provider, participant scheme/value, advertised
  document and process identifiers, observed endpoint metadata where safe,
  lookup time, cache status, and warnings.
- Make providers injectable so tests are deterministic. Set timeouts, bounded
  retries, user-agent identification, response-size limits, and conservative
  caching including negative-cache behaviour. Avoid logging sensitive endpoint
  credentials or untrusted response bodies.
- Expose a typed library API and a CLI with human and JSON output and stable exit
  semantics. Network access must be explicit in documentation.
- Test identifier edge cases, mocked provider responses, DNS/HTTP failures,
  malformed and oversized responses, redirects, timeouts, cache expiry, and AU/NZ
  capability mappings. Gate any live smoke test behind an opt-in flag.
- Document exactly what the result does and does not guarantee, provider terms,
  privacy/security assumptions, and how document/process identifiers are
  versioned.

## Non-goals

Do not scrape general business registers, claim end-to-end delivery readiness,
send test invoices, bypass provider rate limits, or make live network tests part
of the deterministic default test suite.

## Done when

The package builds, tests, and packs cleanly; deterministic provider contract
tests cover every result state; CLI/library outputs agree; failure modes do not
produce false negatives; and the selected discovery method and limitations are
documented with authoritative sources. Report commands run and unresolved
provider constraints.
