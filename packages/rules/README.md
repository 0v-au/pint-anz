# `@pint-anz/rules`

A version-pinned, rights-safe catalogue of PINT A-NZ rule identities, reviewed
fixture coverage, and project editorial metadata.

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
