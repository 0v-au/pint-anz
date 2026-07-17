# PINT A-NZ Lint Action

Validate UBL invoices and credit notes in your repository against the pinned
[PINT A-NZ Billing](https://docs.peppol.eu/poac/aunz/pint-aunz/) ruleset on
every push or pull request. Failures become file-level (and, for XML schema
errors, line-level) annotations on the pull request, a job summary table, and
an optional machine-readable report.

The action wraps [`@pint-anz/lint`](../lint) — the same validator and pinned
ruleset as the `pint-anz-lint` CLI — and never forks its behaviour.

## Quick start

```yaml
name: Validate e-invoices
on: [pull_request]

permissions:
  contents: read

jobs:
  pint-anz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Optional but recommended: reuse the installed ruleset across runs.
      - uses: actions/cache@v4
        with:
          path: ~/.cache/pint-anz
          key: pint-anz-ruleset-1.1.2

      - uses: 0v-au/pint-anz/packages/lint-action@lint-action-v0
        with:
          files: |
            invoices/**/*.xml
```

No other setup is required: the runner's Node.js runs the committed bundle
directly, and XML schema validation uses a bundled WebAssembly libxml2, so
nothing is installed with apt or npm at run time.

## Inputs

| Input | Default | Meaning |
|---|---|---|
| `files` | *(required)* | Newline-separated workspace-relative paths or glob patterns (`*`, `**`, `?`, `[...]`). Absolute paths and `..` segments are rejected; matches are deduplicated and sorted; paths with spaces work. |
| `format` | `human` | Log rendering: `human` (CLI-style PASS/FAIL lines) or `json` (the report envelope on one line). |
| `report-file` | *(empty)* | Workspace-relative path that receives the full JSON report — the same envelope as `pint-anz-lint --format json`. Upload it with `actions/upload-artifact` if you want it preserved. |
| `ruleset-dir` | *(empty)* | Directory holding a prepared ruleset (see `pint-anz-lint ruleset install`). When empty the action installs the pinned ruleset itself; see below. |
| `max-document-bytes` | *(empty)* | Per-document size limit in bytes. Empty applies the validator's default receiver policy; raise it explicitly for documents with large embedded attachments. |
| `max-annotations` | `10` | Upper bound on error/warning annotations. GitHub displays at most 10 annotations of each kind per step; the job summary and report always hold the complete list. |
| `if-no-files-found` | `error` | Behaviour for every unmatched glob: `error` fails the step (matching the CLI), `warn` annotates a warning and continues with any matches, `ignore` continues silently. |

## Outputs

| Output | Meaning |
|---|---|
| `checked-files` | Number of documents validated. |
| `error-count` | Total error diagnostics across all documents. |
| `warning-count` | Total warning diagnostics across all documents. |
| `ruleset-version` | Pinned PINT A-NZ ruleset version used for validation. |

Outputs are written even when the step fails; read them from later steps with
`if: always()` or by setting `continue-on-error` on this step.

## Failure semantics

Exit codes 0–2 match the `pint-anz-lint` CLI exactly:

| Exit code | Step result | Meaning |
|---|---|---|
| `0` | success | Every document completed validation and is valid. |
| `1` | failure | Validation completed and at least one document is invalid. |
| `2` | failure | A configuration mistake prevented a complete result: bad inputs, no matched files, an unverifiable ruleset, or documents the validator refuses (for example DOCTYPE declarations). |
| `3` | failure | An internal action failure. Please report these. |

## The ruleset is pinned, never fetched "latest"

OpenPeppol's copyright statement prohibits repackaging the PINT A-NZ BIS
without prior consent, so the official validation resources are **not**
committed to this repository or bundled with the action. Instead, one of:

- **Default:** the action installs ruleset **1.1.2** exactly as the CLI's
  `pint-anz-lint ruleset install 1.1.2` would — it downloads the two official
  archives from their pinned URLs, verifies their SHA-256 digests against
  values compiled into the bundle, extracts them safely, and compiles the
  Schematron transforms. A newer ruleset is never fetched, and bytes that do
  not match the pinned digests are rejected. Cache `~/.cache/pint-anz` (or set
  `PINT_ANZ_CACHE_DIR`) so this happens once, not every run.
- **Air-gapped:** prepare a ruleset directory yourself from reviewed archives
  (`pint-anz-lint ruleset install 1.1.2 --file … --ubl-file … --offline`),
  make it available to the job, and point `ruleset-dir` at it. The directory
  is checksum-verified before use; validation itself never touches the
  network.

## Permissions and security

- The workflow needs only `permissions: contents: read`. Annotations are
  emitted as workflow commands, which require no extra permissions, and the
  action never posts comments or requests write access.
- The action inspects only files inside the checked-out workspace; patterns
  and report paths that resolve outside it are rejected.
- The only network access is the pinned, digest-verified ruleset download
  described above, and none when `ruleset-dir` is provided or the install
  cache is warm.
- Pin the action by tag, or by commit SHA for the strongest guarantee, and
  let Dependabot update it (`package-ecosystem: "github-actions"` covers
  actions referenced from subdirectories).

## Runtime and distribution

- `runs.using: node24` — the current GitHub Actions Node runtime (runner
  v2.327.1 or later; use an up-to-date runner image on GHES).
- The entry point is a committed, dependency-free esbuild bundle
  ([dist/index.cjs](dist/index.cjs)). `saxon-js`, `xslt3`, and `xmllint-wasm`
  are vendored as real packages under `dist/node_modules/` because they load
  workers, WASM, or subprocesses from their own package directories. Nothing
  is downloaded or installed at start-up, so the action starts as fast as
  Node loads the bundle.
- CI regenerates the bundle on every run and fails if the committed `dist/`
  is stale (`pnpm --filter @pint-anz/lint-action check-dist`), so the
  distributable always matches the sources and the validator version in this
  repository.

## Releasing

The action lives in a monorepo subdirectory, so consumers reference it as
`0v-au/pint-anz/packages/lint-action@<ref>`:

1. Ensure `dist/` is fresh (`pnpm --filter @pint-anz/lint-action build`) and
   committed — the tag must contain the built bundle.
2. Tag the release: `git tag lint-action-v0.1.0 && git push origin lint-action-v0.1.0`.
3. Move the major alias so `@lint-action-v0` tracks the latest compatible
   release: `git tag -f lint-action-v0 && git push -f origin lint-action-v0`.

A ruleset upgrade (for example 1.1.2 → a future release) changes validation
results and is always at least a minor version bump, with the new pinned
version stated in the release notes. Because the action must be a committed
single directory, it is not publishable on the GitHub Marketplace unless it
is split into its own repository; the subdirectory reference above works
without Marketplace listing.

## End-to-end coverage

[`.github/workflows/lint-action-e2e.yml`](../../.github/workflows/lint-action-e2e.yml)
runs the committed action against the fixtures corpus for the pass, fail,
malformed-input, no-matches, and multiple-file scenarios, asserts outcomes
and outputs, and separately proves the checkout-only consumer flow with the
self-installed pinned ruleset. Unit tests spawn the built entry point with
mocked runner environment variables (`INPUT_*`, `GITHUB_OUTPUT`,
`GITHUB_STEP_SUMMARY`, `GITHUB_WORKSPACE`).
