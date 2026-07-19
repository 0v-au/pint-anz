# PINT A-NZ Toolkit

The toolkit helps implementers validate, understand, create, and test PINT A-NZ billing documents while preserving the limits of what each tool can establish.

## Language

**Implementer**:
A developer or integration engineer creating, validating, or troubleshooting PINT A-NZ billing documents.
_Avoid_: End user, accountant, taxpayer

**Official rule**:
A version-specific assertion published in the pinned PINT A-NZ ruleset. The catalogue includes every official rule, whether or not the project can demonstrate it with an isolated fixture.
_Avoid_: Supported rule, implemented rule

**Rule catalogue entry**:
The versioned record for an official rule, including its authoritative metadata and reviewed coverage status. Every official rule has an entry even when no project-authored explanation exists.
_Avoid_: Rule explanation, rule page

**Fixture-backed rule**:
An official rule demonstrated by at least one reviewed fixture in the project corpus.
_Avoid_: Covered rule

**Rule coverage**:
The reviewed relationship between an official rule and the fixture corpus, including cases that cannot be isolated or do not apply to PINT A-NZ documents.
_Avoid_: Documentation status, implementation status

**Project interpretation**:
An independently authored explanation of an official rule, grounded in observed validator and fixture behaviour. It is commentary from this project, not an official summary or a substitute for the copyrighted specification.
_Avoid_: Official guidance, official summary, paraphrase

**Unknown rule**:
A rule identifier that is not present in the pinned official rule inventory. It is distinct from an official rule whose explanation or fixture coverage is incomplete.
_Avoid_: Undocumented rule
