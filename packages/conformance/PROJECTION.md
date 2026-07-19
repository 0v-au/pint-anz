# Rights-safe rule projection

`rule-inventory.json` is generated. Do not edit it by hand.

Regenerate it from the locally downloaded, checksum-verified official artefacts:

```bash
pnpm --filter @pint-anz/conformance inventory
```

The generated projection may contain only identity and provenance fields. The
full working inventory, including official messages and expressions, exists only
in memory while conformance checks run against the gitignored artefact cache.
