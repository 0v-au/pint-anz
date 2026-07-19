import { readFileSync } from "node:fs";
import { XMLParser } from "fast-xml-parser";
import { paths, sha256File, verifyPinnedFiles } from "./artefacts.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => ["pattern", "rule", "assert", "report"].includes(name),
  removeNSPrefix: true,
});

function extractRules(schPath, ruleset) {
  const sch = parser.parse(readFileSync(schPath, "utf8"));
  const rules = [];
  for (const pattern of sch.schema?.pattern ?? []) {
    for (const rule of pattern.rule ?? []) {
      for (const kind of ["assert", "report"]) {
        for (const assertion of rule[kind] ?? []) {
          rules.push({
            id: assertion["@_id"],
            ruleset,
            kind,
            flag: assertion["@_flag"] ?? "fatal",
            context: rule["@_context"],
            test: assertion["@_test"],
            message: String(assertion["#text"] ?? "").replace(/\s+/g, " ").trim(),
          });
        }
      }
    }
  }
  return rules;
}

/** Builds the rule inventory from the pinned Schematron sources on disk. */
export function buildInventory() {
  const lock = verifyPinnedFiles();
  const rules = [
    ...extractRules(paths.pintSch, "pint"),
    ...extractRules(paths.alignedSch, "aligned"),
  ].sort((a, b) => a.id.localeCompare(b.id));

  const duplicates = rules
    .map((rule) => rule.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);

  return {
    rulesetVersion: lock.rulesetVersion,
    sources: {
      "PINT-UBL-validation-preprocessed.sch": sha256File(paths.pintSch),
      "PINT-jurisdiction-aligned-rules.sch": sha256File(paths.alignedSch),
    },
    counts: {
      total: rules.length,
      pint: rules.filter((rule) => rule.ruleset === "pint").length,
      aligned: rules.filter((rule) => rule.ruleset === "aligned").length,
      duplicateIds: [...new Set(duplicates)],
    },
    rules,
  };
}

function familyFor(ruleId) {
  if (ruleId.startsWith("aligned-ibrp-cl-")) return "aligned-codelist";
  if (ruleId.startsWith("aligned-ibrp-sr-")) return "aligned-syntax";
  if (ruleId.startsWith("aligned-ibrp-")) return "aligned-business";
  if (ruleId.startsWith("aligned-ibr-")) return "aligned-jurisdiction";
  if (ruleId.startsWith("ibr-cl-")) return "pint-codelist";
  if (ruleId.startsWith("ibr-co-")) return "pint-calculation";
  if (ruleId.startsWith("ibr-sr-")) return "pint-syntax";
  return "pint-business";
}

/**
 * Projects transient official rule data to rights-safe identity and provenance.
 * Official messages and XPath expressions must never be returned here.
 */
export function buildRuleProjection(inventory = buildInventory()) {
  const lock = verifyPinnedFiles();
  const resources = lock.downloads.find((download) => download.name === "resources.zip");
  return {
    rulesetVersion: inventory.rulesetVersion,
    resourcesUrl: resources.url,
    resourcesSha256: resources.sha256,
    sources: {
      pint: {
        path: "resources/trn-invoice/schematron/PINT-UBL-validation-preprocessed.sch",
        sha256: inventory.sources["PINT-UBL-validation-preprocessed.sch"],
      },
      aligned: {
        path: "resources/trn-invoice/schematron/PINT-jurisdiction-aligned-rules.sch",
        sha256: inventory.sources["PINT-jurisdiction-aligned-rules.sch"],
      },
    },
    counts: inventory.counts,
    rules: inventory.rules.map((rule) => ({
      id: rule.id,
      ruleset: rule.ruleset,
      family: familyFor(rule.id),
      kind: rule.kind,
      severity: rule.flag,
    })),
  };
}
