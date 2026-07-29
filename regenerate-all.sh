#!/usr/bin/env bash
# Regenerate all derived source artefacts. Run from the repository root.
set -euo pipefail

# T009/T014 — rights-safe Rule Catalogue snapshot and interpretation gap report
pnpm --filter @pint-anz/rules generate
