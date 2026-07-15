/**
 * Regenerates rule-inventory.json from the two official Schematron sources.
 *
 * The inventory is checked in and versioned; CI rebuilds it and fails when it
 * no longer matches the pinned .sch files (rule drift).
 */
import { writeFileSync } from "node:fs";
import { buildInventory } from "../src/inventory.js";

const inventory = buildInventory();
const target = new URL("../rule-inventory.json", import.meta.url);
writeFileSync(target, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(
  `rule-inventory.json: ${inventory.counts.total} rules (${inventory.counts.pint} pint + ${inventory.counts.aligned} aligned)` +
    (inventory.counts.duplicateIds.length
      ? `, DUPLICATE IDS: ${inventory.counts.duplicateIds.join(", ")}`
      : ""),
);
