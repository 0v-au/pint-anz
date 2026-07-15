# Prompt: build the PINT A-NZ lint GitHub Action

You are implementing `packages/lint-action` in the PINT A-NZ Toolkit monorepo.
Read the root documentation and `@pint-anz/lint` public API before changing
anything, inspect the worktree, and preserve unrelated changes.

## Goal

Wrap `@pint-anz/lint` in a versioned GitHub Action that validates repository XML
files, annotates actionable failures on pull requests, and fails CI predictably.

## Requirements

- Choose and document an Action runtime/distribution approach that starts
  quickly and uses the exact bundled validator/ruleset; no runtime dependency
  installation or mutable download.
- Define inputs for file patterns and output format plus only those controls that
  have clear semantics. Define outputs for checked files, errors, warnings, and
  ruleset version.
- Expand globs safely relative to the workspace, handle no matches explicitly,
  deduplicate files, and support paths with spaces. Do not inspect outside the
  checked-out workspace.
- Map diagnostics to GitHub workflow annotations when a useful file/line can be
  established; otherwise emit a readable summary. Keep annotations bounded for
  large failure sets while preserving a full machine-readable report artefact or
  output when configured.
- Keep failure semantics aligned with the CLI and distinguish invalid documents,
  configuration mistakes, and internal action failures.
- Commit the distributable artefact expected by GitHub Actions and add a check
  that it is regenerated and clean.
- Test the entry point with mocked Action environment variables and add fixture-
  based end-to-end workflows for pass, fail, malformed input, no matches, and
  multiple files.
- Add `action.yml`, usage examples, permissions guidance, release/tagging notes,
  and Dependabot/security considerations. Replace the placeholder README action
  owner/repository with real metadata only when known.

## Non-goals

Do not fork validation logic, post PR comments, request write permissions by
default, or silently fetch the newest ruleset.

## Done when

The Action runs against a packed/bundled validator, passing fixtures succeed,
failing fixtures create useful annotations and a non-zero result, outputs are
tested, the distribution freshness check passes, and the README example matches
the implemented interface. Report commands and workflows exercised.
