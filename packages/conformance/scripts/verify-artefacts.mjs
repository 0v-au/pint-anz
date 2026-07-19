/** Verifies the complete local conformance input set without downloading it. */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { artefactsDir, paths, sha256, sha256File, verifyPinnedFiles } from "../src/artefacts.js";

export function extractedArchiveProblems({ entries, readArchiveEntry, readExtractedFile }) {
  const problems = [];
  for (const entry of entries.filter((name) => !name.endsWith("/"))) {
    let archived;
    let extracted;
    try {
      archived = readArchiveEntry(entry);
    } catch {
      problems.push(`${entry}: cannot read pinned archive member`);
      continue;
    }
    try {
      extracted = readExtractedFile(entry);
    } catch {
      problems.push(`${entry}: extracted file is missing`);
      continue;
    }
    const archivedDigest = sha256(archived);
    const extractedDigest = sha256(extracted);
    if (archivedDigest !== extractedDigest) {
      problems.push(`${entry}: extracted file differs from the checksum-verified archive`);
    }
  }
  return problems;
}

function verifyUblXsdExtraction(lock) {
  const download = lock.downloads.find((entry) => entry.name === "UBL-2.1.zip");
  if (!download) return ["UBL-2.1.zip is absent from the tracked artefact lock"];
  const archive = join(artefactsDir, download.name);
  const entries = execFileSync("unzip", ["-Z1", archive, "xsd/*"], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
  if (!entries.length) return ["UBL-2.1.zip contains no xsd inputs"];
  return extractedArchiveProblems({
    entries,
    readArchiveEntry: (entry) => execFileSync("unzip", ["-p", archive, entry], { encoding: "buffer", maxBuffer: 20 * 1024 * 1024 }),
    readExtractedFile: (entry) => readFileSync(join(artefactsDir, download.extractTo, entry)),
  });
}

export function verifyLocalArtefacts({
  verifyPinned = verifyPinnedFiles,
  verifyExtracted = verifyUblXsdExtraction,
  fileExists = existsSync,
  readText = (url) => readFileSync(url, "utf8"),
  digestFile = sha256File,
  digestSef = sha256File,
} = {}) {
  const lock = verifyPinned();
  const problems = [...verifyExtracted(lock)];
  let stamp = {};
  try {
    stamp = JSON.parse(readText(new URL("../../../artefacts/sef/compile-stamp.json", import.meta.url)));
  } catch {
    problems.push("compiled validator stamp is missing");
  }
  if (!lock?.compiled) problems.push("compiled validator digests are absent from the tracked artefact lock");
  if (stamp.compiler !== lock?.compiled?.compiler) problems.push("compiled validator stamp has the wrong compiler identity");
  for (const name of ["pint", "aligned"]) {
    const expected = lock?.compiled?.[name];
    const sefPath = name === "pint" ? paths.pintSef : paths.alignedSef;
    const xsltPath = name === "pint" ? paths.pintXslt : paths.alignedXslt;
    if (!expected) {
      problems.push(`${name} compiled validator digest is absent from the tracked artefact lock`);
      continue;
    }
    const sourceDigest = digestFile(xsltPath);
    if (sourceDigest !== expected.sourceSha256) problems.push(`${name} compiled validator source differs from the tracked digest`);
    if (!fileExists(sefPath)) {
      problems.push(`${name} compiled validator is missing`);
    } else if (digestSef(sefPath) !== expected.sefSha256) {
      problems.push(`${name} compiled validator differs from the tracked digest`);
    }
    if (
      stamp[name]?.sourceSha256 !== expected.sourceSha256 ||
      stamp[name]?.sefSha256 !== expected.sefSha256
    ) problems.push(`${name} compiled validator stamp differs from the tracked digests`);
  }
  if (problems.length) {
    throw new Error(`Local conformance artefacts are incomplete or drifted:\n${problems.join("\n")}\nRun \`pnpm --filter @pint-anz/conformance artefacts\` explicitly.`);
  }
  return lock;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    verifyLocalArtefacts();
    console.log("Downloaded archives, extracted XSDs, pinned rule sources, and compiled validators verified.");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
