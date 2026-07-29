import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";

import metadataSchema from "../content/interpretation.schema.json" with { type: "json" };

const metadataPattern = /^<!-- pint-anz-interpretation\n([\s\S]*?)\n-->\n/;
const requiredSections = [
  "Project interpretation",
  "Common causes",
  "Safe fix",
  "Failing fragment",
  "Corrected fragment",
  "Official source and copyright",
];

export const interpretationMetadataKeys = [
  "schemaVersion",
  "ruleId",
  "rulesetVersion",
  "editorialState",
  "reviewedAt",
  "jurisdictions",
  "documentTypes",
  "affectedTerms",
  "officialRuleUrl",
  "example",
];

function isCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= days[month - 1];
}

function isAbsoluteUri(value) {
  try {
    return new URL(value).protocol.length > 1;
  } catch {
    return false;
  }
}

const metadataAjv = new Ajv2020({ allErrors: true, strict: true });
metadataAjv.addFormat("date", { type: "string", validate: isCalendarDate });
metadataAjv.addFormat("uri", { type: "string", validate: isAbsoluteUri });
const validateMetadata = metadataAjv.compile(metadataSchema);

function fail(path, message) {
  throw new Error(`Rule interpretation ${path}: ${message}`);
}

export function validateInterpretationMetadata(metadata, path = "(metadata)") {
  if (!validateMetadata(metadata)) {
    const details = validateMetadata.errors
      .map((error) => `${error.instancePath || "/"} ${error.message}`)
      .join("; ");
    fail(path, `metadata does not match interpretation.schema.json: ${details}`);
  }
  return metadata;
}

function section(markdown, heading, path) {
  const marker = `## ${heading}\n`;
  const start = markdown.indexOf(marker);
  if (start < 0) fail(path, `missing "${heading}" section`);
  const bodyStart = start + marker.length;
  const next = markdown.indexOf("\n## ", bodyStart);
  return markdown.slice(bodyStart, next < 0 ? markdown.length : next).trim();
}

function xmlFence(value, label, path) {
  const match = /^```xml\n([\s\S]+)\n```$/.exec(value);
  if (!match) fail(path, `${label} must contain exactly one xml code fence`);
  return match[1];
}

function bulletList(value, label, path) {
  const lines = value.split("\n");
  if (lines.length === 0 || lines.some((line) => !line.startsWith("- ") || line.length < 4)) {
    fail(path, `${label} must be a non-empty Markdown bullet list`);
  }
  return lines.map((line) => line.slice(2));
}

/** Apply a record's exact, ordered changes to its complete failing fixture. */
export function applyExamplePatches(source, record) {
  let corrected = source;
  for (const [index, patch] of record.metadata.example.patches.entries()) {
    const first = corrected.indexOf(patch.find);
    if (first < 0) fail(record.path, `example patch ${index} does not match its fixture`);
    if (corrected.indexOf(patch.find, first + patch.find.length) >= 0) {
      fail(record.path, `example patch ${index} is ambiguous in its fixture`);
    }
    corrected = `${corrected.slice(0, first)}${patch.replace}${corrected.slice(first + patch.find.length)}`;
  }
  return corrected;
}

export function parseInterpretation(path) {
  const source = readFileSync(path, "utf8");
  const metadataMatch = metadataPattern.exec(source);
  if (!metadataMatch) fail(path, "missing JSON metadata comment");

  let metadata;
  try {
    metadata = JSON.parse(metadataMatch[1]);
  } catch (error) {
    fail(path, `metadata is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  validateInterpretationMetadata(metadata, path);

  const markdown = source.slice(metadataMatch[0].length);
  const titleMatch = /^# (.+)\n/.exec(markdown);
  if (!titleMatch) fail(path, "missing level-one title");
  for (const heading of requiredSections) section(markdown, heading, path);

  const officialSection = section(markdown, "Official source and copyright", path);
  if (!officialSection.includes(`[OpenPeppol's exact rule page](${metadata.officialRuleUrl})`)) {
    fail(path, "official-source section must link the metadata URL");
  }
  if (!officialSection.includes("Project Interpretation")) {
    fail(path, "official-source section must distinguish the Project Interpretation");
  }
  if (!officialSection.includes("copyrighted")) {
    fail(path, "official-source section must state the copyright boundary");
  }

  return {
    path,
    metadata,
    title: titleMatch[1],
    summary: section(markdown, "Project interpretation", path),
    commonCauses: bulletList(section(markdown, "Common causes", path), "Common causes", path),
    fix: section(markdown, "Safe fix", path),
    failingXml: xmlFence(section(markdown, "Failing fragment", path), "Failing fragment", path),
    correctedXml: xmlFence(section(markdown, "Corrected fragment", path), "Corrected fragment", path),
    markdown,
  };
}

export function loadInterpretations(packageRoot) {
  const versionRoot = join(packageRoot, "content", "interpretations");
  const versions = readdirSync(versionRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const records = [];
  for (const version of versions) {
    const directory = join(versionRoot, version);
    for (const file of readdirSync(directory).filter((name) => name.endsWith(".md")).sort()) {
      const record = parseInterpretation(join(directory, file));
      if (basename(file, ".md") !== record.metadata.ruleId) {
        fail(record.path, `filename must match ruleId ${record.metadata.ruleId}`);
      }
      if (version !== record.metadata.rulesetVersion) {
        fail(record.path, `directory version must match rulesetVersion ${record.metadata.rulesetVersion}`);
      }
      records.push(record);
    }
  }
  return records;
}
