#!/usr/bin/env node

import { runCli } from "../dist/cli.js";

try {
  process.exitCode = await runCli(process.argv);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`pint-anz-lookup: ${message}\n`);
  process.exitCode = 4;
}
