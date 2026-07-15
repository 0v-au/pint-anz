import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  RULESET_DIGEST,
  RULESET_VERSION,
  expandPatterns,
  installRuleset,
  resolveRulesetDirectory,
  validateFile,
  type Diagnostic,
  type ValidationResult,
} from "@pint-anz/lint";
import { annotate, appendSummary, getInput, setOutput } from "./workflow.js";

/** Exit codes 0-2 match the pint-anz-lint CLI; 3 marks an internal action failure. */
export const EXIT_VALID = 0;
export const EXIT_INVALID = 1;
export const EXIT_CONFIGURATION = 2;
export const EXIT_INTERNAL = 3;

const FORMATS = ["human", "json"] as const;
const NO_MATCH_BEHAVIOURS = ["error", "warn", "ignore"] as const;
const SUMMARY_DOCUMENT_LIMIT = 100;
const SUMMARY_DIAGNOSTIC_LIMIT = 100;

interface Report {
  readonly rulesetVersion: typeof RULESET_VERSION;
  readonly rulesetDigest: typeof RULESET_DIGEST;
  readonly complete: boolean;
  readonly valid: boolean;
  readonly results: readonly ValidationResult[];
}

function writeOutputs(checkedFiles: number, errorCount: number, warningCount: number): void {
  setOutput("checked-files", checkedFiles);
  setOutput("error-count", errorCount);
  setOutput("warning-count", warningCount);
  setOutput("ruleset-version", RULESET_VERSION);
}

function configurationFailure(message: string): number {
  annotate("error", message, { title: "PINT A-NZ lint configuration" });
  return EXIT_CONFIGURATION;
}

function escapesWorkspace(workspace: string, path: string): boolean {
  const outside = relative(workspace, path);
  return outside.startsWith("..") || isAbsolute(outside);
}

function countBySeverity(results: readonly ValidationResult[], severity: Diagnostic["severity"]): number {
  return results.reduce(
    (total, result) => total + result.diagnostics.filter((item) => item.severity === severity).length,
    0,
  );
}

function renderHuman(result: ValidationResult): string {
  if (result.valid) return `PASS ${result.document} (PINT A-NZ ${result.rulesetVersion})`;
  const heading = result.complete ? "FAIL" : "ERROR";
  const lines = [`${heading} ${result.document} (PINT A-NZ ${result.rulesetVersion})`];
  for (const item of result.diagnostics) {
    const rule = item.ruleId ? ` ${item.ruleId}` : "";
    const location = item.location ? ` at ${item.location}` : "";
    lines.push(`  ${item.severity.toUpperCase()}${rule} [${item.stage}]${location}`);
    lines.push(`    ${item.message}`);
  }
  return lines.join("\n");
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function renderSummary(report: Report, reportFile: string): string {
  const errorCount = countBySeverity(report.results, "error");
  const warningCount = countBySeverity(report.results, "warning");
  const lines = [
    "## PINT A-NZ lint",
    "",
    `Ruleset ${report.rulesetVersion} (resources SHA-256 \`${report.rulesetDigest}\`)`,
    "",
    "| Documents | Passed | Errors | Warnings |",
    "|---:|---:|---:|---:|",
    `| ${report.results.length} | ${report.results.filter((item) => item.valid).length} | ${errorCount} | ${warningCount} |`,
    "",
    "| Document | Result | Errors | Warnings |",
    "|---|---|---:|---:|",
  ];
  for (const result of report.results.slice(0, SUMMARY_DOCUMENT_LIMIT)) {
    const outcome = result.valid ? "✅ pass" : result.complete ? "❌ fail" : "⚠️ incomplete";
    lines.push(
      `| ${markdownCell(result.document)} | ${outcome} | ${result.diagnostics.filter((item) => item.severity === "error").length} | ${result.diagnostics.filter((item) => item.severity === "warning").length} |`,
    );
  }
  if (report.results.length > SUMMARY_DOCUMENT_LIMIT) {
    lines.push("", `${report.results.length - SUMMARY_DOCUMENT_LIMIT} further documents are not listed here.`);
  }
  lines.push("");
  const diagnostics = report.results.flatMap((result) =>
    result.diagnostics.map((item) => ({ result, item })),
  );
  if (diagnostics.length > 0) {
    lines.push("| Document | Severity | Rule | Stage | Message |", "|---|---|---|---|---|");
    for (const { result, item } of diagnostics.slice(0, SUMMARY_DIAGNOSTIC_LIMIT)) {
      lines.push(
        `| ${markdownCell(result.document)} | ${item.severity} | ${item.ruleId ?? "—"} | ${item.stage} | ${markdownCell(item.message)}${item.location ? ` at \`${markdownCell(item.location)}\`` : ""} |`,
      );
    }
    if (diagnostics.length > SUMMARY_DIAGNOSTIC_LIMIT) {
      lines.push(
        "",
        `${diagnostics.length - SUMMARY_DIAGNOSTIC_LIMIT} further diagnostics are not listed here${reportFile ? `; the complete report is at \`${reportFile}\`` : "; set the report-file input for the complete report"}.`,
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}

function annotateDiagnostics(report: Report, maxAnnotations: number, reportFile: string): void {
  let emitted = 0;
  let omitted = 0;
  for (const result of report.results) {
    for (const item of result.diagnostics) {
      if (emitted >= maxAnnotations) {
        omitted += 1;
        continue;
      }
      emitted += 1;
      // Schema diagnostics locate a line; Schematron locations are XPaths.
      const line = item.location ? /^line (\d+)$/.exec(item.location)?.[1] : undefined;
      const location = item.location && !line ? ` at ${item.location}` : "";
      annotate(item.severity, `${item.message}${location} [${item.stage}]`, {
        file: result.document,
        line,
        title: item.ruleId
          ? `PINT A-NZ ${report.rulesetVersion} rule ${item.ruleId}`
          : `PINT A-NZ ${report.rulesetVersion} ${item.stage} check`,
      });
    }
  }
  if (omitted > 0) {
    annotate(
      "notice",
      `${omitted} further diagnostics were not annotated (max-annotations: ${maxAnnotations}). The job summary${reportFile ? ` and ${reportFile}` : ""} hold the complete list.`,
    );
  }
}

export async function runAction(): Promise<number> {
  const failEarly = (message: string): number => {
    writeOutputs(0, 0, 0);
    return configurationFailure(message);
  };

  const workspace = process.env.GITHUB_WORKSPACE && resolve(process.env.GITHUB_WORKSPACE);
  if (!workspace) {
    return failEarly("GITHUB_WORKSPACE is not set; run this action on a runner after actions/checkout.");
  }

  const patterns = getInput("files")
    .split(/\r?\n/)
    .map((pattern) => pattern.trim())
    .filter(Boolean);
  const format = getInput("format") || "human";
  const reportFile = getInput("report-file");
  const rulesetDirInput = getInput("ruleset-dir");
  const maxAnnotationsInput = getInput("max-annotations") || "10";
  const maxDocumentBytesInput = getInput("max-document-bytes");
  const ifNoFilesFound = getInput("if-no-files-found") || "error";

  if (patterns.length === 0) {
    return failEarly("The files input is required: one workspace-relative path or glob pattern per line.");
  }
  if (!(FORMATS as readonly string[]).includes(format)) {
    return failEarly(`Unsupported format: ${format}. Supported: ${FORMATS.join(", ")}.`);
  }
  if (!(NO_MATCH_BEHAVIOURS as readonly string[]).includes(ifNoFilesFound)) {
    return failEarly(
      `Unsupported if-no-files-found value: ${ifNoFilesFound}. Supported: ${NO_MATCH_BEHAVIOURS.join(", ")}.`,
    );
  }
  const maxAnnotations = Number(maxAnnotationsInput);
  if (!Number.isInteger(maxAnnotations) || maxAnnotations < 0) {
    return failEarly(`max-annotations must be a non-negative integer, not ${maxAnnotationsInput}.`);
  }
  const maxDocumentBytes = maxDocumentBytesInput ? Number(maxDocumentBytesInput) : undefined;
  if (maxDocumentBytes !== undefined && (!Number.isInteger(maxDocumentBytes) || maxDocumentBytes <= 0)) {
    return failEarly(`max-document-bytes must be a positive integer, not ${maxDocumentBytesInput}.`);
  }
  const escaping = patterns.find(
    (pattern) =>
      isAbsolute(pattern) || /^[A-Za-z]:/.test(pattern) || pattern.split(/[\\/]/).includes(".."),
  );
  if (escaping) {
    return failEarly(
      `File patterns must stay inside the workspace: ${escaping} is absolute or contains "..".`,
    );
  }
  const reportTarget = reportFile && resolve(workspace, reportFile);
  if (reportTarget && escapesWorkspace(workspace, reportTarget)) {
    return failEarly(`report-file must stay inside the workspace: ${reportFile}.`);
  }

  let rulesetDirectory: string;
  if (rulesetDirInput) {
    try {
      rulesetDirectory = await resolveRulesetDirectory(resolve(workspace, rulesetDirInput));
    } catch (error) {
      return failEarly(
        `ruleset-dir does not hold a verified PINT A-NZ ${RULESET_VERSION} ruleset: ${(error as Error).message}`,
      );
    }
  } else {
    try {
      const installed = await installRuleset();
      rulesetDirectory = installed.directory;
      process.stdout.write(
        `Using PINT A-NZ ${installed.version} at ${installed.directory} (resources SHA-256 ${installed.resourcesSha256}).\n`,
      );
    } catch (error) {
      return failEarly(
        `Cannot install the pinned PINT A-NZ ${RULESET_VERSION} ruleset: ${(error as Error).message} ` +
          "Provide a prepared ruleset via the ruleset-dir input, or allow the runner to download the pinned official archives.",
      );
    }
  }

  // Workspace-relative annotation paths keyed by resolved path, deduplicated.
  const files = new Map<string, string>();
  for (const match of await expandPatterns(patterns, workspace)) {
    const absolute = resolve(workspace, match);
    if (escapesWorkspace(workspace, absolute)) {
      return failEarly(`Matched file is outside the workspace: ${match}.`);
    }
    files.set(absolute, relative(workspace, absolute).split(sep).join("/"));
  }

  if (files.size === 0) {
    writeOutputs(0, 0, 0);
    const message = `No files matched: ${patterns.join(", ")}`;
    if (ifNoFilesFound === "error") return configurationFailure(message);
    if (ifNoFilesFound === "warn") annotate("warning", message, { title: "PINT A-NZ lint" });
    else process.stdout.write(`${message}\n`);
    return EXIT_VALID;
  }

  const results: ValidationResult[] = [];
  for (const [absolute, relativePath] of files) {
    const validated = await validateFile(absolute, { rulesetDirectory, maxDocumentBytes });
    results.push({
      ...validated,
      document: relativePath,
      diagnostics: validated.diagnostics.map((item) => ({ ...item, document: relativePath })),
    });
  }

  const report: Report = {
    rulesetVersion: RULESET_VERSION,
    rulesetDigest: RULESET_DIGEST,
    complete: results.every((item) => item.complete),
    valid: results.every((item) => item.valid),
    results,
  };
  writeOutputs(results.length, countBySeverity(results, "error"), countBySeverity(results, "warning"));

  if (format === "json") process.stdout.write(`${JSON.stringify(report)}\n`);
  else process.stdout.write(`${results.map(renderHuman).join("\n")}\n`);

  if (reportTarget) {
    await mkdir(dirname(reportTarget), { recursive: true });
    await writeFile(reportTarget, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`Report written to ${reportFile}.\n`);
  }

  annotateDiagnostics(report, maxAnnotations, reportFile);
  appendSummary(renderSummary(report, reportFile));

  if (!report.complete) {
    const incomplete = results.filter((item) => !item.complete).length;
    annotate(
      "error",
      `${incomplete} of ${results.length} document(s) could not be completely validated; see the diagnostics above.`,
      { title: "PINT A-NZ lint" },
    );
    return EXIT_CONFIGURATION;
  }
  if (!report.valid) {
    const failing = results.filter((item) => !item.valid).length;
    annotate(
      "error",
      `${failing} of ${results.length} document(s) failed PINT A-NZ ${RULESET_VERSION} validation.`,
      { title: "PINT A-NZ lint" },
    );
    return EXIT_INVALID;
  }
  process.stdout.write(`All ${results.length} document(s) pass PINT A-NZ ${RULESET_VERSION}.\n`);
  return EXIT_VALID;
}
