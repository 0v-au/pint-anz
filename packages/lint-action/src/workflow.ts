import { appendFileSync } from "node:fs";

export type AnnotationKind = "error" | "warning" | "notice";

export interface AnnotationProperties {
  readonly file?: string;
  readonly line?: string;
  readonly title?: string;
}

/** Read an action input the way the runner exposes it: INPUT_<UPPERCASED NAME>. */
export function getInput(name: string): string {
  const normalized = name.replace(/ /g, "_").toUpperCase();
  const underscored = normalized.replace(/-/g, "_");
  const envNames = [`INPUT_${normalized}`, `INPUT_${underscored}`];
  for (const envName of envNames) {
    const value = process.env[envName];
    if (value !== undefined) return value.trim();
  }
  return "";
}

function escapeData(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function escapeProperty(value: string): string {
  return escapeData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}

/** Emit a workflow-command annotation; `file` must be workspace-relative. */
export function annotate(
  kind: AnnotationKind,
  message: string,
  properties: AnnotationProperties = {},
): void {
  const rendered = Object.entries(properties)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `${key}=${escapeProperty(value)}`)
    .join(",");
  process.stdout.write(`::${kind}${rendered ? ` ${rendered}` : ""}::${escapeData(message)}\n`);
}

/** Append a single-line output value; silently a no-op outside a runner. */
export function setOutput(name: string, value: string | number): void {
  const path = process.env.GITHUB_OUTPUT;
  if (path) appendFileSync(path, `${name}=${value}\n`, "utf8");
}

/** Append Markdown to the job summary; silently a no-op outside a runner. */
export function appendSummary(markdown: string): void {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (path) appendFileSync(path, markdown, "utf8");
}
