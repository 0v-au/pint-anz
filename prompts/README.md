# Package implementation prompts

These prompts turn the package descriptions in the root README into bounded,
copy-and-paste implementation briefs. Each prompt is self-contained, but the
recommended delivery order is:

1. `fixtures`
2. `lint`
3. `rules`
4. `mapper`
5. `lint-action`
6. `lookup`
7. `playground`

That order establishes the executable examples first, then the validator and
its human-facing explanations, followed by document generation and adapters.

| Package | Prompt |
|---|---|
| `@pint-anz/fixtures` | [fixtures.md](./fixtures.md) |
| `@pint-anz/lint` | [lint.md](./lint.md) |
| `@pint-anz/rules` | [rules.md](./rules.md) |
| `@pint-anz/mapper` | [mapper.md](./mapper.md) |
| PINT A-NZ lint action | [lint-action.md](./lint-action.md) |
| `@pint-anz/lookup` | [lookup.md](./lookup.md) |
| PINT A-NZ playground | [playground.md](./playground.md) |

Before using a prompt, replace any unresolved repository metadata such as the
GitHub organisation and repository name. Every implementation must pin the
official PINT A-NZ artefact version it supports; it must not silently fetch or
adopt a newer ruleset at runtime.
