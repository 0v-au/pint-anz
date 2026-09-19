# `@pint-anz/lint`

Validate UBL 2.1 invoices and credit notes against the pinned PINT A-NZ
Billing 1.1.2 ruleset from Node.js, a shell, or CI.

The validator runs a complete pipeline: hardened input preflight, OASIS UBL
2.1 XSD validation, the shared PINT Schematron, and the A-NZ jurisdiction
Schematron. It never reports a partial run as a compliant document.

## Install

`@pint-anz/lint` is not yet published to npm. Build the CLI from a clone of
this repository, then install the pinned ruleset:

```bash
pnpm --filter @pint-anz/lint build
node packages/lint/bin/cli.js ruleset install 1.1.2
```

The second command downloads the two pinned official archives, verifies their
SHA-256 digests, safely extracts them, compiles the Schematron transforms, and
stores the result under `~/.cache/pint-anz/rulesets/1.1.2`. Validation itself
never uses the network.

OpenPeppol's copyright statement prohibits repackaging the PINT A-NZ BIS
without prior consent, so its validation resources are installed from the
official distribution rather than copied into this npm package. For a fully
air-gapped installation, supply both previously reviewed archives:

```bash
node packages/lint/bin/cli.js ruleset install 1.1.2 \
  --file /controlled/resources.zip \
  --ubl-file /controlled/UBL-2.1.zip \
  --offline
```

`--file` does not weaken integrity checking. Local bytes must match the same
pinned digests as downloaded bytes.

## CLI

```bash
node packages/lint/bin/cli.js invoice.xml --offline
node packages/lint/bin/cli.js invoice.xml credit-note.xml --offline
node packages/lint/bin/cli.js 'test/invoices/**/*.xml' --offline
node packages/lint/bin/cli.js 'test/invoices/**/*.xml' --format json --offline
```

Quoted glob patterns support `*`, `**`, `?`, and character classes. Inputs are
sorted for deterministic output. Human output is the default; JSON output has
this stable batch envelope:

```json
{
  "rulesetVersion": "1.1.2",
  "rulesetDigest": "5750a93fe98c4e1bad1d1030f749a473d4b2c3afc5bdeb5372889804b4273d1a",
  "complete": true,
  "valid": false,
  "results": []
}
```

Each result contains `document`, `documentType`, `rulesetVersion`,
`rulesetDigest`, `complete`, `valid`, and `diagnostics`. Each diagnostic contains
`severity`, `ruleId`, `message`, `location`, `document`, `rulesetVersion`,
`rulesetDigest`, and `stage`. A business-rule diagnostic with a rule ID also
contains a canonical, versioned `remediationUrl`, for example:

```text
https://pint-anz.0v.com.au/rules/1.1.2/ibr-004
```

That page is an independently authored Project Interpretation. It is not the
copyrighted official rule text or a substitute for the official specification.

Exit codes are stable:

| Code | Meaning |
|---|---|
| `0` | Every document completed validation and is valid |
| `1` | Validation completed and at least one document is invalid |
| `2` | Input, configuration, ruleset, or internal tooling prevented a complete result |

Ruleset administration is explicit:

```bash
node packages/lint/bin/cli.js ruleset list
node packages/lint/bin/cli.js ruleset verify 1.1.2
node packages/lint/bin/cli.js ruleset install 1.1.2
node packages/lint/bin/cli.js ruleset show ibr-004
node packages/lint/bin/cli.js ruleset show ibr-004 --json
```

`--ruleset-dir` can point validation or verification at a controlled prepared
directory. `PINT_ANZ_CACHE_DIR` overrides the default cache root.

`ruleset show` is a local viewer for the exact official rule that you installed
from OpenPeppol. It first verifies the installed ruleset, then re-hashes and
reads the local Schematron source. Human and JSON output include the official
ID, severity, message, XPath context and test, pinned ruleset version and
archive digest, exact source-file provenance, and a copyright notice.

The command does not fetch, bundle, copy, separately cache, or proxy official
text. Install the ruleset first, or point at a prepared installation:

```bash
node packages/lint/bin/cli.js ruleset show aligned-ibr-001-aunz \
  --ruleset-dir /controlled/pint-anz/1.1.2
```

For `ruleset show`, exit `0` means the rule was found, exit `1` means the ID is
an Unknown Rule in the pinned ruleset, and exit `2` means the installation is
missing or unverified, arguments are invalid, or the inspection tool failed.

## Library API

```ts
import { validateDocument, validateFile } from "@pint-anz/lint";

const fromDisk = await validateFile("invoice.xml");
const fromMemory = await validateDocument(xmlBytes, {
  documentName: "received-invoice.xml",
});

if (!fromDisk.complete) {
  // The input, ruleset, or validator prevented a compliance decision.
} else if (!fromDisk.valid) {
  for (const diagnostic of fromDisk.diagnostics) {
    console.error(diagnostic.ruleId, diagnostic.message, diagnostic.location);
  }
}
```

The API does not print, exit, fetch, or mutate process state. An explicit
`rulesetDirectory` and `maxDocumentBytes` can be supplied where required. The
default receiver policy limits documents to 100 KiB; this is a toolkit safety
policy, not an official PINT rule.

Ruleset cache operations are also exported: `installRuleset`,
`verifyRuleset`, `listInstalledRulesets`, `resolveRulesetDirectory`, and
`defaultCacheDirectory`.

## Validation and security

The pipeline is ordered and stops when an earlier stage cannot complete:

1. read bytes and enforce size, UTF-8, DOCTYPE, and supported-root policy
2. validate Invoice or CreditNote against the OASIS UBL 2.1 XSD
3. run the official shared PINT transform
4. run the official PINT A-NZ aligned transform
5. normalize SVRL failures without changing upstream rule IDs or messages

XSD validation runs in an isolated WebAssembly worker with every schema
dependency preloaded; it performs no filesystem or network resolution.
DOCTYPE declarations are rejected before any XML parser runs. Schematron uses
checksum-verified, locally compiled SEF files and makes no participant, tax,
or business-register lookups. ZIP installation rejects absolute paths,
traversal, links, encryption, unsupported compression, and excessive sizes;
cache replacement is atomic.

## Coverage and performance

The public API is tested against all 214 fixtures from `@pint-anz/fixtures`:
21 valid documents, 180 isolated business-rule failures, 2 malformed inputs,
6 policy rejections, and 5 schema-invalid inputs. The conformance inventory
tracks all 245 official assertions; 63 rules are documented as unisolatable
and 2 as not applicable. See `packages/conformance/COVERAGE.md` in the source
repository for those limits.

Schemas and compiled stylesheets are cached in-process. Validation remains
CPU-bound and creates an isolated XSD worker per call; callers processing many
documents should apply bounded concurrency rather than starting an unbounded
`Promise.all`.

## Pinned provenance and licensing

PINT A-NZ Billing 1.1.2:

- specification: `https://docs.peppol.eu/poac/aunz/pint-aunz/`
- resources: `https://docs.peppol.eu/poac/aunz/pint-aunz/resources.zip`
- resources SHA-256: `5750a93fe98c4e1bad1d1030f749a473d4b2c3afc5bdeb5372889804b4273d1a`

OASIS UBL 2.1:

- archive: `https://docs.oasis-open.org/ubl/os-UBL-2.1/UBL-2.1.zip`
- archive SHA-256: `60b80d76394a8a2add90723ecb8e0e2e9d826775de9749df37a72d60703f86ed`

The package is MIT licensed. The installed OpenPeppol and OASIS artefacts
retain their upstream ownership and terms and are not redistributed by this
package.

## Upgrading the ruleset

Ruleset upgrades are reviewed changes, never floating updates:

1. verify the official release, status, copyright, archive URL, and release notes
2. download the archives independently and review their contents
3. update the version, URLs, archive hashes, and selected-file hashes in source
4. rebuild the rule inventory and fixture coverage report
5. run the conformance suite and this package's API, CLI, offline-install, and pack tests
6. publish a new package version; never change the meaning of an existing cached version
