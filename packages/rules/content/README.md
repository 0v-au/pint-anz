# Rule catalogue source

`editorial-review.json` classifies every rights-safe rule identity. Reviewed
Project Interpretations live as plain Markdown under
`interpretations/<ruleset-version>/`.

`interpretation-gaps.generated.json` is generated. Do not edit it by hand.
Regenerate it, together with the public catalogue snapshot, from the repository
root:

```sh
./regenerate-all.sh
```

The standalone command is:

```sh
pnpm --filter @pint-anz/rules generate
```
