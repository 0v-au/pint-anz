/**
 * Validate documents from the command line.
 *
 *   pnpm --filter @pint-anz/conformance validate <file.xml> [more.xml ...]
 *
 * Prints the pipeline stage reached and every Schematron rule that fired.
 * Exit code 0 means "ran"; inspect the output for expectations.
 */
import { validateDocument } from "../src/validate.js";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: validate-cli.mjs <file.xml> [...]");
  process.exit(2);
}

for (const file of files) {
  const result = await validateDocument(file);
  console.log(`\n== ${file}`);
  console.log(`stage: ${result.stage}`);
  for (const reason of result.rejectionReasons) console.log(`  rejected: ${reason}`);
  for (const error of result.xsdErrors) console.log(`  xsd: ${error}`);
  if (result.stage === "rules") {
    if (result.fired.length === 0) {
      console.log("  schematron: clean (0 failed asserts)");
    } else {
      for (const f of result.fired) {
        console.log(`  ${f.flag.toUpperCase()} ${f.id} [${f.ruleset}] at ${f.location}`);
        console.log(`      ${f.text.slice(0, 160)}`);
      }
    }
  }
}
