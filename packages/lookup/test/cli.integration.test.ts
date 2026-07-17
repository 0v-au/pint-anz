import { spawnSync } from "node:child_process";

import { describe, expect, it, vi } from "vitest";

import { runCli } from "../src/cli.js";
import type { DiscoveryProvider } from "../src/types.js";

const PARTICIPANT = "iso6523-actorid-upis::9999:specification-example";
const LOOKUP_TIME = Date.parse("2026-07-16T01:02:03.000Z");

function outputBuffer(): { readonly values: string[]; write(value: string): void } {
  const values: string[] = [];
  return { values, write: (value) => void values.push(value) };
}

function capableProvider(): DiscoveryProvider {
  return {
    name: "deterministic-cli-provider",
    discover: vi.fn().mockResolvedValue({
      state: "found",
      provider: "deterministic-cli-provider",
      source: "test.invalid",
      capabilities: [
        {
          kind: "invoice",
          documentScheme: "peppol-doctype-wildcard",
          documentValue: "urn:example:invoice",
          processScheme: "cenbii-procid-ubl",
          processValue: "urn:peppol:bis:billing",
          endpoints: [],
          signatureStatus: "not-verified",
        },
      ],
      advertisedDocuments: ["peppol-doctype-wildcard::urn:example:invoice"],
      advertisedProcesses: ["cenbii-procid-ubl::urn:peppol:bis:billing"],
      warnings: ["SMP signature present but not cryptographically verified."],
    }),
  };
}

describe("lookup CLI", () => {
  it("AC-07: CLI and library outcomes agree", async () => {
    const human = outputBuffer();
    const json = outputBuffer();
    const stderr = outputBuffer();
    const provider = capableProvider();
    const common = ["node", "pint-anz-lookup", "--participant", PARTICIPANT, "--no-cache"];

    const humanExit = await runCli(common, {
      provider,
      stdout: human,
      stderr,
      now: () => LOOKUP_TIME,
    });
    const jsonExit = await runCli([...common, "--format", "json"], {
      provider,
      stdout: json,
      stderr,
      now: () => LOOKUP_TIME,
    });
    const parsed = JSON.parse(json.values.join("")) as { readonly state: string };

    expect(humanExit).toBe(0);
    expect(jsonExit).toBe(0);
    expect(parsed.state).toBe("capable");
    expect(human.values.join("")).toContain("CAPABLE");
    expect(human.values.join("")).toContain(PARTICIPANT);
    expect(stderr.values).toEqual([]);

    const built = spawnSync(
      process.execPath,
      [new URL("../bin/cli.js", import.meta.url).pathname, "--abn", "invalid", "--format", "json"],
      { encoding: "utf8" },
    );
    expect(built.status).toBe(2);
    expect(JSON.parse(built.stdout)).toMatchObject({ state: "invalid-input" });
  });

  it("uses stable non-success exit codes and rejects ambiguous input", async () => {
    const states = [
      ["not-found", 1],
      ["temporarily-unavailable", 3],
      ["indeterminate", 4],
    ] as const;

    for (const [state, expectedExit] of states) {
      const provider: DiscoveryProvider = {
        name: `provider-${state}`,
        discover: async () => ({
          state,
          provider: `provider-${state}`,
          source: "test.invalid",
          capabilities: [],
          advertisedDocuments: [],
          advertisedProcesses: [],
          warnings: [],
        }),
      };
      expect(
        await runCli(["node", "pint-anz-lookup", "--participant", PARTICIPANT], {
          provider,
          stdout: outputBuffer(),
          stderr: outputBuffer(),
          now: () => LOOKUP_TIME,
        }),
      ).toBe(expectedExit);
    }

    const absentProvider: DiscoveryProvider = {
      name: "provider-capability-absent",
      discover: async () => ({
        state: "found",
        provider: "provider-capability-absent",
        source: "test.invalid",
        capabilities: [],
        advertisedDocuments: [],
        advertisedProcesses: [],
        warnings: [],
      }),
    };
    expect(
      await runCli(["node", "pint-anz-lookup", "--participant", PARTICIPANT], {
        provider: absentProvider,
        stdout: outputBuffer(),
        stderr: outputBuffer(),
        now: () => LOOKUP_TIME,
      }),
    ).toBe(1);

    const stderr = outputBuffer();
    expect(
      await runCli(
        ["node", "pint-anz-lookup", "--abn", "1", "--nzbn", "2"],
        { stdout: outputBuffer(), stderr },
      ),
    ).toBe(4);
    expect(stderr.values.join("")).toContain("Exactly one");
  });
});
