# Agent instructions

## Test identifiers

- Never assume a checksum-valid ABN, NZBN, tax ID, or other government-issued
  identifier is synthetic; it may belong to a real entity.
- Prefer identifiers published in the applicable official specification. Check
  the authoritative register and document provenance, lookup date, and limits.
- Do not describe an identifier as reserved unless the issuing authority says
  so. Specification examples are for offline fixtures, not live network use.

## Building and running

- `pnpm build` (and `pnpm test`) build the whole workspace, which includes
  `@pint-anz/conformance`. That package first requires the official artefacts:
  run `pnpm --filter @pint-anz/conformance run artefacts` before `pnpm build`,
  exactly as CI does (`.github/workflows/ci.yml`). The artefact fetch pins a
  compiled-SEF digest and can fail under newer Node than CI's Node 22.
- To build and run just the linter without the conformance harness:
  `pnpm --filter @pint-anz/lint build`, then invoke the CLI directly with
  `node packages/lint/bin/cli.js` (the `@pint-anz/*` packages are not published
  to npm, so `pnpm exec pint-anz-lint` does not resolve). The lookup CLI is
  `node packages/lookup/bin/cli.js` after `pnpm --filter @pint-anz/lookup build`.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
