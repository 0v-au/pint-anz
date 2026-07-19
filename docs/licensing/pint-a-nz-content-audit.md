# PINT A-NZ content and licensing audit

Audit date: **2026-07-20** (Australia/Brisbane)

This is a project release-risk audit, not legal advice. Copyright exceptions and
the legal character of individual rule identifiers, facts, XML structures, or
short expressions have not been determined. Obtain written permission from
OpenPeppol or advice from a qualified lawyer before relying on a broader use.

## Permission status and authoritative sources

No written redistribution permission is recorded in this repository. The
current release therefore treats official rule messages, XPath contexts and
tests, examples, Schematron/XSLT, and bulk specification text as content that
must not enter npm packages or the static site.

Sources checked on 2026-07-20:

- PINT A-NZ Billing 1.1.2 landing page and resources download:
  <https://docs.peppol.eu/poac/aunz/pint-aunz/>
- PINT A-NZ BIS, `Introduction > Statement of copyright`:
  <https://docs.peppol.eu/poac/aunz/pint-aunz/bis/>
- OpenPeppol's current Post Award documentation register:
  <https://peppol.org/documentation/technical-documentation/post-award-documentation/>
- OpenPeppol documentation and contact route:
  <https://peppol.org/documentation/> (`info@peppol.eu` is listed there)

The BIS page says that OpenPEPPOL and its members own PINT copyright, that
OpenPEPPOL AISBL holds copyright in the BIS, and that prior consent is required
to modify, redistribute, sell, or repackage it. The landing page identifies the
active download as PINT A-NZ Billing 1.1.2, released 21 November 2025. The BIS
page itself displays “Version 1.1.1” in its header while reached from that 1.1.2
landing page; this inconsistency is another reason to identify the pinned
archive by URL and SHA-256 rather than infer its version from the BIS header.

The exact operative sentence displayed in the official notice is:

> This Peppol BIS document may not be modified, re-distribute, sold or
> repackaged in any other way without the prior consent of OpenPEPPOL AISBL.

## Repository findings

The manual audit covered all 742 paths reported by `git ls-files` at the time of
review. The repeatable publication check derives workspace packages from
`pnpm-workspace.yaml` and asks npm for each public package's actual file list
with `npm pack --dry-run --json --ignore-scripts`; private packages are skipped.

| Content | Finding | Publication status / action |
|---|---|---|
| `packages/conformance/rule-inventory.json` | Contains 245 exact official messages, XPath contexts, and assertion/report tests extracted from the two pinned Schematron files. | High risk. The package is private and the file is not in an npm pack, but it is tracked in the source repository. Keep it out of all published artefacts; replace it with a rights-safe identity projection if the source repository itself is made public or OpenPeppol does not approve this use. |
| `packages/conformance/coverage.json` and generated `COVERAGE.md` | Project-authored validator observations for 245 rules. Nine justifications include an exact assertion expression; many describe assertion behaviour and XML locations in original technical language. | Not in an npm pack. Preserve the observations as internal evidence, but remove exact XPath quotations before publishing the report or migrate public coverage to status, fixture IDs, and independently written summaries. |
| `packages/conformance/artefacts.lock.json` | URLs and SHA-256 digests only. Downloaded official archives are under gitignored `artefacts/`. | Rights-safe provenance. Keep the archives untracked and outside package/static roots. |
| `packages/conformance/AUTHORING.md` and `CODELISTS.md` | Authoring instructions and project analysis; they refer contributors to locally downloaded rule tests. | Private package/source documentation. Do not copy exact tests into public authoring output. |
| `packages/fixtures/official-examples-map.md` | Names the 19 official examples and records structural features observed in them. Its former statement that no identifiers were copied was incorrect and was fixed by this audit: the four identifiers in `parties.md` intentionally come from the official examples; party names, addresses, references, and amounts are project-authored. | Excluded by the fixtures package `files` allowlist. Retain as provenance; do not publish it without a separate review. |
| `packages/fixtures/{valid,invalid,...}`, `parties.md`, and `manifest.json` | 214 project fixtures use targeted, project-authored mutations. The four checksum-valid ABN/NZBN values are official specification fixture identifiers and are reused throughout; provenance, register lookup date, and live-use limits are documented. An exact-message scan found no official rule message outside the inventory. | Published by `@pint-anz/fixtures`. Treat the identifiers as provenance-labelled specification examples, never as reserved or safe for live use. Automated checks cover exact official expressions and archive formats, but authors must still review examples for close derivation because semantic similarity cannot be reliably detected automatically. |
| `packages/lint` | Downloads checksum-pinned resources from OpenPeppol, stores them in the user's cache, and emits upstream messages only while running the locally installed validator. No `rulesets/` directory or official archive is currently packed. | Acceptable under the project's conservative boundary. Do not bundle, proxy, or separately cache the downloaded content in npm/static output. |
| `packages/lint-action`, `packages/lookup` | No official rules or examples found. The Action bundle contains only downloader/validator code and dependency licences. | No issue found in the reviewed outputs. |
| Root docs, prompts, ADRs and task files | Project plans and short references to the copyright restriction; no catalogue of official wording. | Not npm/static output. Maintain attribution and the independent-interpretation terminology. |

The exact-expression scan found no exact official message outside
`rule-inventory.json`. It found nine exact test expressions in the two coverage
representations. Simple XML paths are not treated as protected phrases because
they necessarily occur in synthetic UBL invoices. Distinctive contexts with
predicates or operators are checked; all contextual reuse remains subject to
human review when published as prose.

## Rights-safe migration plan

Until written permission is recorded:

1. Keep the checksum-verified official archives and the full extracted inventory
   local to the private conformance build. Never commit or pack the archives.
2. Before a public-source release, replace the tracked full inventory with a
   deterministic projection containing only rule ID, ruleset family, severity,
   version, source URL, and source digests. Rebuild and compare that projection
   against the locally downloaded Schematron in CI so drift detection remains.
3. Preserve conformance evidence as fixture IDs, observed fired rule IDs,
   coverage state, tool/version/digest, and independently authored observations.
   Rewrite the nine exact test quotations and do not publish `COVERAGE.md` as-is.
4. Publish only independently authored Project Interpretations. Link to the
   official page and instruct implementers to download, checksum-verify, and
   inspect the exact rule locally. Do not describe these pages as official
   summaries or guidance.
5. Record any permission as a dated file under `docs/licensing/permissions/`
   containing the grantor, exact content and versions covered, permitted media,
   conditions, expiry/revocation terms, and the original correspondence. Then
   deliberately amend the automated policy; absence of such a record means no
   permission.

The current npm boundary is verified by `pnpm rights:check`. Every public
package runs the same focused check from `prepack` and `prepublishOnly`; npm file
discovery uses `--ignore-scripts`, so that inspection does not recurse into the
lifecycle hook. The conformance gate additionally uses
`--verify-fingerprints`, recomputing the complete named set against all 19 XML
examples in the checksum-pinned local archive.

The checked-in `official-example-fingerprints.json` records a filename, raw
SHA-256, and layout-insensitive canonical XML SHA-256 for each example. The
canonical form removes the XML declaration and comments and normalises
whitespace while preserving element, attribute, and text order; it is not W3C
XML Canonicalization and is only a structural backstop. The check also decodes
UTF-8, UTF-16, HTML numeric entities, and JSON/JavaScript Unicode escapes before
matching messages and assertions. Short generic assertions are rejected only
in rule-metadata fields to limit false positives.

Static output is never inferred from an absent hard-coded directory. After the
site build, deployment must run `pnpm rights:check:site`, which passes the built
directory explicitly through `--site`; a missing or empty output fails. Raw and
canonical fingerprints and exact-expression checks can detect specified forms
of copying, but they do not establish that content is non-infringing and cannot
reliably detect paraphrase, partial copying, reordered XML, or close derivation.
Those cases require editorial and, where needed, qualified legal review.

## Release decision

**Conditional pass for current npm packages; fail for publishing the tracked
full inventory or coverage report.** T009 and the static site may proceed only
with the rights-safe projection and Project Interpretation model. The repository
should not be represented as cleared for publication while the full inventory
is tracked and permission remains unresolved.
