# Put the ruleset version in canonical rule URLs

Canonical rule documentation URLs use the project-owned `pint-anz.0v.com.au` hostname and include the ruleset version, such as `https://pint-anz.0v.com.au/rules/1.1.2/ibr-004`. Linter diagnostics use those versioned URLs. An unversioned convenience URL may redirect for human browsing, but it is not a diagnostic reference because a silent change of target would disconnect a validation result from the ruleset that produced it. The base URL is centralised so any future hostname migration is explicit and testable.
