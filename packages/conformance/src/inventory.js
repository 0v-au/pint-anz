import { readFileSync } from "node:fs";
import { XMLParser } from "fast-xml-parser";
import { paths, readLock, sha256File } from "./artefacts.js";

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
  const lock = readLock();
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
