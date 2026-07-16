import { Command, InvalidArgumentError } from "commander";
import { resolve } from "node:path";
import { expandPatternsChecked } from "./globs.js";
import {
  defaultCacheDirectory,
  installRuleset,
  listInstalledRulesets,
  verifyRuleset,
} from "./rulesets.js";
import { RULESET_DIGEST, RULESET_VERSION, type ValidationResult } from "./types.js";
import { validateFile } from "./validate.js";

export function exitCodeFor(result: ValidationResult | readonly ValidationResult[]): 0 | 1 | 2 {
  const results = Array.isArray(result) ? result : [result];
  if (results.some((item) => !item.complete)) return 2;
  return results.every((item) => item.valid) ? 0 : 1;
}

function renderHuman(result: ValidationResult): string {
  const provenance = `  RULESET SHA-256 ${result.rulesetDigest}`;
  if (result.valid) {
    return `PASS ${result.document} (PINT A-NZ ${result.rulesetVersion})\n${provenance}`;
  }
  const heading = result.complete ? "FAIL" : "ERROR";
  const lines = [`${heading} ${result.document} (PINT A-NZ ${result.rulesetVersion})`, provenance];
  for (const item of result.diagnostics) {
    const rule = item.ruleId ? ` ${item.ruleId}` : "";
    const location = item.location ? ` at ${item.location}` : "";
    lines.push(`  ${item.severity.toUpperCase()}${rule} [${item.stage}]${location}`);
    lines.push(`    ${item.message}`);
  }
  return lines.join("\n");
}

function parseFailure(program: Command, error: unknown): number {
  const code = (error as { code?: string }).code;
  if (code === "commander.helpDisplayed" || code === "commander.version") return 0;
  if (error instanceof InvalidArgumentError || code?.startsWith("commander.")) {
    process.stderr.write(`${program.helpInformation()}\n`);
    return 2;
  }
  throw error;
}

/** Reject any ruleset version other than the one this build pins. */
function rejectUnsupportedVersion(version: string | undefined): boolean {
  if (version === RULESET_VERSION) return false;
  process.stderr.write(`Unsupported ruleset version: ${version}. Supported: ${RULESET_VERSION}.\n`);
  return true;
}

function parsePositiveInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new InvalidArgumentError("Expected a positive integer.");
  }
  return parsed;
}

async function runRuleset(argv: readonly string[]): Promise<number> {
  const command = argv[0];
  if (command === "install") {
    const program = new Command()
      .name("pint-anz-lint ruleset install")
      .argument("<version>")
      .option("--file <archive>", "local official PINT resources.zip")
      .option("--ubl-file <archive>", "local official UBL-2.1.zip")
      .option("--cache-dir <directory>")
      .option("--offline", "forbid downloads")
      .exitOverride();
    try {
      program.parse(argv.slice(1), { from: "user" });
    } catch (error) {
      return parseFailure(program, error);
    }
    const [version] = program.args;
    if (rejectUnsupportedVersion(version)) return 2;
    const options = program.opts<{
      file?: string;
      ublFile?: string;
      cacheDir?: string;
      offline?: boolean;
    }>();
    try {
      const installed = await installRuleset({
        resourcesArchive: options.file && resolve(options.file),
        ublArchive: options.ublFile && resolve(options.ublFile),
        cacheDirectory: options.cacheDir && resolve(options.cacheDir),
        offline: options.offline,
      });
      process.stdout.write(`Installed PINT A-NZ ${installed.version} at ${installed.directory}\n`);
      return 0;
    } catch (error) {
      process.stderr.write(`Ruleset installation failed: ${(error as Error).message}\n`);
      return 2;
    }
  }

  if (command === "list") {
    const program = new Command()
      .name("pint-anz-lint ruleset list")
      .option("--cache-dir <directory>")
      .exitOverride();
    try {
      program.parse(argv.slice(1), { from: "user" });
    } catch (error) {
      return parseFailure(program, error);
    }
    const options = program.opts<{ cacheDir?: string }>();
    const installed = await listInstalledRulesets(options.cacheDir && resolve(options.cacheDir));
    process.stdout.write(
      installed.length > 0
        ? `${installed.map((item) => `${item.version}\t${item.directory}`).join("\n")}\n`
        : "No PINT A-NZ rulesets installed.\n",
    );
    return 0;
  }

  if (command === "verify") {
    const program = new Command()
      .name("pint-anz-lint ruleset verify")
      .argument("<version>")
      .option("--cache-dir <directory>")
      .option("--ruleset-dir <directory>")
      .exitOverride();
    try {
      program.parse(argv.slice(1), { from: "user" });
    } catch (error) {
      return parseFailure(program, error);
    }
    const [version] = program.args;
    if (rejectUnsupportedVersion(version)) return 2;
    const options = program.opts<{ cacheDir?: string; rulesetDir?: string }>();
    const directory = options.rulesetDir
      ? resolve(options.rulesetDir)
      : resolve(options.cacheDir ?? defaultCacheDirectory(), RULESET_VERSION);
    try {
      const verified = await verifyRuleset(directory);
      process.stdout.write(`Verified PINT A-NZ ${verified.version} at ${verified.directory}\n`);
      return 0;
    } catch (error) {
      process.stderr.write(`Ruleset verification failed: ${(error as Error).message}\n`);
      return 2;
    }
  }

  process.stderr.write("Usage: pint-anz-lint ruleset <install|list|verify>\n");
  return 2;
}

export async function run(argv: readonly string[]): Promise<number> {
  if (argv[0] === "ruleset") return runRuleset(argv.slice(1));

  const program = new Command()
    .name("pint-anz-lint")
    .version("0.1.0")
    .description(`Validate UBL documents against PINT A-NZ ${RULESET_VERSION}`)
    .argument("<files...>", "UBL Invoice/CreditNote paths or glob patterns")
    .option("--ruleset-dir <directory>", "prepared offline ruleset directory")
    .option("--ruleset-version <version>", "pinned ruleset version", RULESET_VERSION)
    .option("--offline", "require an already installed ruleset")
    .option(
      "--max-document-bytes <bytes>",
      "override the default per-document size limit",
      parsePositiveInteger,
    )
    .option("--format <format>", "human or json", "human")
    .addHelpText(
      "after",
      "\nRulesets:\n  pint-anz-lint ruleset <install|list|verify> [options]\n",
    )
    .exitOverride();

  try {
    program.parse([...argv], { from: "user" });
  } catch (error) {
    return parseFailure(program, error);
  }

  const options = program.opts<{
    rulesetDir?: string;
    rulesetVersion: string;
    offline?: boolean;
    maxDocumentBytes?: number;
    format: string;
  }>();
  if (!(["human", "json"] as const).includes(options.format as "human" | "json")) {
    process.stderr.write(`Unsupported format: ${options.format}\n`);
    return 2;
  }
  if (rejectUnsupportedVersion(options.rulesetVersion)) return 2;

  let files: string[];
  let unmatched: string[];
  try {
    ({ files, unmatched } = await expandPatternsChecked(program.args));
  } catch (error) {
    process.stderr.write(`Invalid file pattern: ${(error as Error).message}\n`);
    return 2;
  }
  if (unmatched.length > 0) {
    process.stderr.write(`No files matched: ${unmatched.join(", ")}\n`);
    return 2;
  }
  const results: ValidationResult[] = [];
  for (const file of files) {
    results.push(
      await validateFile(file, {
        rulesetDirectory: options.rulesetDir && resolve(options.rulesetDir),
        maxDocumentBytes: options.maxDocumentBytes,
      }),
    );
  }

  if (options.format === "json") {
    process.stdout.write(
      `${JSON.stringify({
        rulesetVersion: RULESET_VERSION,
        rulesetDigest: RULESET_DIGEST,
        complete: results.every((item) => item.complete),
        valid: results.every((item) => item.valid),
        results,
      })}\n`,
    );
  } else process.stdout.write(`${results.map(renderHuman).join("\n")}\n`);
  return exitCodeFor(results);
}
