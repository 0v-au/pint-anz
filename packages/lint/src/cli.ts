import { Command, InvalidArgumentError } from "commander";
import { resolve } from "node:path";
import { validateFile } from "./validate.js";
import type { ValidationResult } from "./types.js";

export function exitCodeFor(result: ValidationResult): 0 | 1 | 2 {
  if (!result.complete) return 2;
  return result.valid ? 0 : 1;
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

export async function run(argv: readonly string[]): Promise<number> {
  const program = new Command()
    .name("pint-anz-lint")
    .description("Validate one UBL document against PINT A-NZ 1.1.2")
    .argument("<file>", "UBL Invoice or CreditNote")
    .requiredOption("--ruleset-dir <directory>", "prepared offline ruleset directory")
    .option("--format <format>", "human or json", "human")
    .exitOverride()
    .configureOutput({ writeOut: () => undefined, writeErr: () => undefined });

  try {
    program.parse([...argv], { from: "user" });
  } catch (error) {
    if (error instanceof InvalidArgumentError || (error as { code?: string }).code?.startsWith("commander.")) {
      process.stderr.write(`${program.helpInformation()}\n`);
      return 2;
    }
    throw error;
  }

  const [file] = program.args;
  const options = program.opts<{ rulesetDir: string; format: string }>();
  if (!(["human", "json"] as const).includes(options.format as "human" | "json")) {
    process.stderr.write(`Unsupported format: ${options.format}\n`);
    return 2;
  }

  const validation = await validateFile(file, { rulesetDirectory: resolve(options.rulesetDir) });
  process.stdout.write(
    options.format === "json" ? `${JSON.stringify(validation)}\n` : `${renderHuman(validation)}\n`,
  );
  return exitCodeFor(validation);
}
