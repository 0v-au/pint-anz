#!/usr/bin/env bash
# Regenerate all derived source artefacts. Run from the repository root.
set -euo pipefail

# T009 — rights-safe Rule Catalogue snapshot
pnpm --filter @pint-anz/rules generate
