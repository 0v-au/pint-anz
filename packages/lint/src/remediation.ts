import { RULESET_VERSION } from "./types.js";

/** Canonical public origin for Project Interpretation pages. */
export const REMEDIATION_ORIGIN = "https://pint-anz.0v.com.au" as const;

/**
 * Return the canonical versioned Project Interpretation URL for an Official Rule.
 *
 * The helper is deliberately local to `@pint-anz/lint`: diagnostics must not
 * require `@pint-anz/rules` at runtime.
 */
export function ruleRemediationUrl(ruleId: string): string {
  return `${REMEDIATION_ORIGIN}/rules/${RULESET_VERSION}/${encodeURIComponent(ruleId)}`;
}
