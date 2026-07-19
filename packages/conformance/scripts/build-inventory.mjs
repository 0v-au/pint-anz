/**
 * Regenerates the rights-safe rule identity projection from the two official
 * Schematron sources. Full messages and XPath expressions remain transient.
 *
 * The projection is checked in and versioned; CI rebuilds it and fails when it
 * no longer matches the pinned .sch files (rule drift).
 */
import { writeFileSync } from "node:fs";
import { buildInventory, buildRuleProjection } from "../src/inventory.js";

const inventory = buildInventory();
const projection = buildRuleProjection(inventory);
const target = new URL("../rule-inventory.json", import.meta.url);
writeFileSync(target, `${JSON.stringify(projection, null, 2)}\n`);
console.log(
  `rule-inventory.json: ${projection.counts.total} rights-safe rule identities ` +
    `(${projection.counts.pint} pint + ${projection.counts.aligned} aligned)` +
    (inventory.counts.duplicateIds.length
      ? `, DUPLICATE IDS: ${inventory.counts.duplicateIds.join(", ")}`
      : ""),
);
