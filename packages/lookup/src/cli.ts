import { Command, CommanderError, Option } from "commander";

import { lookup } from "./lookup.js";
import type {
  CapabilityRequest,
  DiscoveryProvider,
  LookupResult,
  LookupState,
  ParticipantInput,
} from "./types.js";

interface WritableText {
  write(value: string): unknown;
}

interface CliDependencies {
  readonly provider?: DiscoveryProvider;
  readonly stdout?: WritableText;
  readonly stderr?: WritableText;
  readonly now?: () => number;
}

interface CliOptions {
  readonly abn?: string;
  readonly nzbn?: string;
  readonly participant?: string;
  readonly capability: CapabilityRequest;
  readonly format: "human" | "json";
  readonly cache: boolean;
}

const EXIT_CODES: Readonly<Record<LookupState, number>> = {
  capable: 0,
  "participant-found-capability-absent": 1,
  "not-found": 1,
  "invalid-input": 2,
  "temporarily-unavailable": 3,
  indeterminate: 4,
};

/** Return the stable process exit code for a Lookup Result. */
export function exitCodeForResult(result: Pick<LookupResult, "state">): number {
  return EXIT_CODES[result.state];
}

/** Execute the CLI with injectable output and provider dependencies. */
export async function runCli(
  argv: readonly string[] = process.argv,
  dependencies: CliDependencies = {},
): Promise<number> {
  const stdout = dependencies.stdout ?? process.stdout;
  const stderr = dependencies.stderr ?? process.stderr;
  const program = createProgram(stdout, stderr);

  try {
    await program.parseAsync([...argv]);
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.code === "commander.helpDisplayed" || error.code === "commander.version"
        ? 0
        : 4;
    }
    throw error;
  }

  const options = program.opts<CliOptions>();
  const input = participantInput(options);
  if (input === undefined) {
    stderr.write("Exactly one of --abn, --nzbn, or --participant is required.\n");
    return 4;
  }

  const result = await lookup(input, {
    capability: options.capability,
    provider: dependencies.provider,
    cache: options.cache ? undefined : false,
    now: dependencies.now,
  });
  stdout.write(options.format === "json" ? `${JSON.stringify(result, null, 2)}\n` : renderHuman(result));
  return exitCodeForResult(result);
}

function createProgram(stdout: WritableText, stderr: WritableText): Command {
  return new Command()
    .name("pint-anz-lookup")
    .description("Discover advertised PINT A-NZ billing capabilities on Peppol")
    .version("0.1.0")
    .option("--abn <value>", "look up an Australian Business Number")
    .option("--nzbn <value>", "look up a New Zealand Business Number")
    .option("--participant <value>", "look up a full Peppol Participant Identifier")
    .addOption(
      new Option("--capability <kind>", "capability to assess")
        .choices(["invoice", "credit-note"])
        .default("invoice"),
    )
    .addOption(
      new Option("--format <format>", "output format")
        .choices(["human", "json"])
        .default("human"),
    )
    .option("--no-cache", "disable the in-process lookup cache")
    .exitOverride()
    .configureOutput({
      writeOut: (value) => stdout.write(value),
      writeErr: (value) => stderr.write(value),
    });
}

function participantInput(options: CliOptions): ParticipantInput | undefined {
  const inputs: ParticipantInput[] = [];
  if (options.abn !== undefined) inputs.push({ kind: "abn", value: options.abn });
  if (options.nzbn !== undefined) inputs.push({ kind: "nzbn", value: options.nzbn });
  if (options.participant !== undefined) {
    inputs.push({ kind: "participant", value: options.participant });
  }
  return inputs.length === 1 ? inputs[0] : undefined;
}

function renderHuman(result: LookupResult): string {
  const participant = result.evidence.participant?.canonical ?? "invalid input";
  const lines = [
    `${humanState(result.state)}: ${participant}`,
    `Requested capability: ${result.requestedCapability}`,
    `Provider: ${result.evidence.provider}`,
    `Observed: ${result.evidence.lookupTime} (${result.evidence.cacheStatus})`,
  ];

  if (result.capabilities.length > 0) {
    lines.push("Advertised PINT A-NZ capabilities:");
    for (const capability of result.capabilities) {
      lines.push(
        `  - ${capability.kind}: ${capability.documentScheme}::${capability.documentValue}`,
        `    process: ${capability.processScheme}::${capability.processValue}`,
        `    signature: ${capability.signatureStatus}`,
      );
    }
  }

  for (const warning of result.evidence.warnings) lines.push(`Warning: ${warning}`);
  return `${lines.join("\n")}\n`;
}

function humanState(state: LookupState): string {
  switch (state) {
    case "capable":
      return "CAPABLE";
    case "participant-found-capability-absent":
      return "CAPABILITY NOT ADVERTISED";
    case "not-found":
      return "PARTICIPANT NOT FOUND";
    case "temporarily-unavailable":
      return "TEMPORARILY UNAVAILABLE";
    case "invalid-input":
      return "INVALID INPUT";
    case "indeterminate":
      return "INDETERMINATE";
  }
}
