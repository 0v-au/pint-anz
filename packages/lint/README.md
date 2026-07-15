# `@pint-anz/lint`

Validate UBL 2.1 invoices and credit notes against a pinned PINT A-NZ ruleset
from the command line, CI, or a Node.js application.

> Status: developer vertical slice. Single-file library and CLI validation now
> run the complete XSD and Schematron pipeline against an explicitly prepared
> local ruleset directory. Ruleset installation, globbing, and publishable
> zero-configuration operation remain planned.

## Current developer slice

### Install xmllint

The current validation pipeline uses `xmllint` from libxml2 for safe, offline
UBL schema validation. Check whether it is already installed:

```bash
xmllint --version
```

macOS usually includes it at `/usr/bin/xmllint`. If it is unavailable, install
libxml2 with Homebrew and add its tools to your path:

```bash
brew install libxml2
export PATH="$(brew --prefix libxml2)/bin:$PATH"
```

On Ubuntu or Debian:

```bash
sudo apt-get update
sudo apt-get install libxml2-utils
```

On Fedora:

```bash
sudo dnf install libxml2
```

### Run the developer slice

Fetch and compile the pinned artefacts through the internal conformance harness,
then build and run the linter:

```bash
pnpm --filter @pint-anz/conformance artefacts
pnpm --filter @pint-anz/lint build
node packages/lint/bin/cli.js invoice.xml --ruleset-dir ./artefacts
node packages/lint/bin/cli.js invoice.xml --ruleset-dir ./artefacts --format json
```

The CLI exits `0` for a valid document, `1` for a document that completed
validation with errors, and `2` when input, ruleset, or tooling prevented a
complete result. It currently requires `xmllint` on `PATH`.

```js
import { validateFile } from "@pint-anz/lint";

const result = await validateFile("invoice.xml", {
  rulesetDirectory: "/controlled/pint-anz-1.1.2",
});
```

`result.valid` can only be true after UBL XSD validation and both official
Schematron transforms complete. A missing or unusable ruleset produces
`complete: false`; partial validation is never presented as compliance.

## Validation pipeline

Validation will run in explicit stages:

1. read the input and parse well-formed XML safely
2. identify a supported UBL Invoice or Credit Note
3. validate against the OASIS UBL 2.1 XSD
4. run the shared PINT Schematron rules
5. run the PINT A-NZ jurisdiction rules
6. return normalized diagnostics and a stable exit code

Partial validation will not be reported as PINT A-NZ compliance.

## Ruleset installation

Rulesets are versioned separately from the CLI. The CLI will trust a pinned
official URL and SHA-256 digest for each supported version.

Download the pinned official archive:

```bash
pint-anz-lint ruleset install 1.1.2
```

Install the same archive from a local file for air-gapped or controlled CI:

```bash
pint-anz-lint ruleset install 1.1.2 \
  --file /tmp/resources.zip
```

`--file` changes where the bytes come from, not which bytes are trusted. The
archive must match the digest pinned for `1.1.2`, contain the expected files,
and pass safe ZIP extraction checks. Installation will be atomic and cached by
version and digest.

Other planned ruleset commands:

```bash
pint-anz-lint ruleset list
pint-anz-lint ruleset verify 1.1.2
```

The npm package will not download rulesets during `postinstall` and will never
silently upgrade an installed ruleset.

## Validate documents

```bash
pint-anz-lint invoice.xml
pint-anz-lint 'test/invoices/**/*.xml'
pint-anz-lint invoice.xml --format json
pint-anz-lint invoice.xml --ruleset-version 1.1.2 --offline
```

`--offline` will prohibit network access and fail clearly if the pinned ruleset
is not already installed.

Planned exit codes:

| Code | Meaning |
|---|---|
| `0` | Every document is valid |
| `1` | At least one document is invalid |
| `2` | Input, configuration, ruleset, or internal tool failure |

The library API will return structured diagnostics without printing output or
terminating the process.

## CI

Pre-install a reviewed archive, then validate without network access:

```yaml
- run: pnpm exec pint-anz-lint ruleset install 1.1.2 --file .cache/resources.zip
- run: pnpm exec pint-anz-lint 'test/invoices/**/*.xml' --offline
```

Cache the installed ruleset directory using the version and pinned digest as
the cache key. Do not cache an unverified extracted archive.

## Artefacts and licensing

OASIS UBL 2.1 XSD files may be distributed with their required copyright and
notice text. OpenPeppol owns the PINT A-NZ specification and validation
artefacts; until redistribution permission is confirmed, the npm package will
not repackage its Schematron or compiled XSLT files. Users can install the
official archive directly using the ruleset commands above.

Official PINT A-NZ 1.1.2 resources:

- https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/
- https://docs.peppol.eu/poac/aunz/2025-Q4/pint-aunz/resources.zip

## Security and reproducibility

- XML external entities and network resolution will be disabled.
- Downloads will use a pinned HTTPS URL and SHA-256 digest.
- ZIP entries with absolute paths or traversal components will be rejected.
- Extraction and cache replacement will be atomic.
- Validation will not make participant, tax, or business-register lookups.
- Diagnostics will include the exact ruleset version and digest.

## Development

The behavioural contract is `@pint-anz/fixtures`. See the root
[`TODO.md`](../../TODO.md) for coverage work and the package implementation
prompt in [`prompts/lint.md`](../../prompts/lint.md).
