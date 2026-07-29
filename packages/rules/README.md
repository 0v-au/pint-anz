# `@pint-anz/rules`

A version-pinned, rights-safe catalogue of PINT A-NZ rule identities, reviewed
fixture coverage, project editorial metadata, and a bounded launch set of
independently authored Project Interpretations.

This package does not reproduce the official rule wording, XPath expressions, or
examples. The `official.source` field links to OpenPeppol's authoritative ruleset.
Download and checksum-verify the official resources through the toolkit before
inspecting their exact contents locally.

```ts
import { findRules, getRule, rules } from "@pint-anz/rules";

getRule("ibr-004");
findRules({ topic: "codelists", coverage: "invalid-covered" });
console.log(rules.length); // 245
```

The machine-readable snapshot is exported as `@pint-anz/rules/rules.json`.
`rules`, its records, and nested arrays are frozen at runtime.

## Updating the snapshot

The generator reads the private conformance projection and coverage evidence only
at build time. It requires one explicit editorial classification for every rule:

```sh
pnpm --filter @pint-anz/rules generate
pnpm --filter @pint-anz/rules test
```

An official ruleset change fails the snapshot check until identity, coverage,
fixtures, provenance, and editorial classifications agree on the new version.

## Authoring a Project Interpretation

Interpretations are plain Markdown records under
`content/interpretations/<ruleset-version>/`. Each record has JSON metadata,
project-authored explanation, common causes, a safe fix, minimal failing and
corrected fragments, and a link to OpenPeppol's copyrighted original. It also
names an isolated failing fixture and deterministic patches used to construct a
complete corrected document.

The package test runs both complete documents through the checksum-pinned
validator: the source fixture must fire its named rule and the corrected document
must be clean. A fixture-backed `draft` is a valid authoring state but cannot enter
the release snapshot; change it to `reviewed` only after content and validator
evidence have been reviewed. Reviewer identity remains in pull-request history.

The selection rationale is in `content/launch-selection.md`. The generated
`content/interpretation-gaps.generated.json` accounts for the reviewed launch set
and every remaining rule identity.
