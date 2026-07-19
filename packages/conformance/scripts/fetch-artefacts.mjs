/**
 * Downloads and verifies the pinned official artefacts, then compiles the
 * official Schematron XSLTs to Saxon-JS SEF files.
 *
 * Everything lands in <repo>/artefacts/ which is gitignored: the official
 * resources must not be redistributed in this repo or any published package
 * until redistribution permission is confirmed.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { artefactsDir, paths, readLock, sha256, sha256File, verifyPinnedFiles } from "../src/artefacts.js";

const require = createRequire(import.meta.url);
const fixedBuildTime = require.resolve("./fixed-build-time.cjs");

const lock = readLock();
mkdirSync(artefactsDir, { recursive: true });
mkdirSync(`${artefactsDir}sef`, { recursive: true });

for (const download of lock.downloads) {
  const zipPath = artefactsDir + download.name;
  let mustDownload = true;
  if (existsSync(zipPath)) {
    mustDownload = sha256File(zipPath) !== download.sha256;
  }

  if (mustDownload) {
    console.log(`Downloading ${download.url}`);
    const response = await fetch(download.url);
    if (!response.ok) throw new Error(`${download.url}: HTTP ${response.status}`);
    const body = Buffer.from(await response.arrayBuffer());
    const actual = sha256(body);
    if (actual !== download.sha256) {
      throw new Error(
        `${download.name}: checksum mismatch.\n  pinned:     ${download.sha256}\n  downloaded: ${actual}\n` +
          `The official artefact changed upstream. Review the change before repinning.`,
      );
    }
    writeFileSync(zipPath, body);
  }

  const extractDir = artefactsDir + download.extractTo;
  const args = ["-q", "-o", zipPath];
  if (download.extractGlob) args.push(download.extractGlob);
  args.push("-d", extractDir);
  execFileSync("unzip", args);
}

verifyPinnedFiles();

// Compile Schematron XSLT -> SEF once per source checksum. The invoice and
// credit-note copies of both transforms are byte-identical (asserted by the
// lock file), so one compiled transform serves both document types.
const stampPath = `${artefactsDir}sef/compile-stamp.json`;
const wanted = {
  pint: lock.compiled.pint,
  aligned: lock.compiled.aligned,
};
let stamp = {};
try {
  stamp = JSON.parse(readFileSync(stampPath, "utf8"));
} catch {
  // first compile
}

for (const [name, expected] of Object.entries(wanted)) {
  const sefPath = name === "pint" ? paths.pintSef : paths.alignedSef;
  const xsltPath = name === "pint" ? paths.pintXslt : paths.alignedXslt;
  if (
    stamp.compiler === lock.compiled.compiler &&
    stamp[name]?.sourceSha256 === expected.sourceSha256 &&
    stamp[name]?.sefSha256 === expected.sefSha256 &&
    existsSync(sefPath) &&
    sha256File(sefPath) === expected.sefSha256
  ) continue;
  console.log(`Compiling ${name} Schematron XSLT to SEF`);
  execFileSync(
    "node",
    [
      "--require",
      fixedBuildTime,
      require.resolve("xslt3"),
      `-xsl:${xsltPath}`,
      `-export:${sefPath}`,
      "-nogo",
      "-relocate:on",
    ],
    { stdio: "inherit" },
  );
  const actual = sha256File(sefPath);
  if (actual !== expected.sefSha256) {
    throw new Error(`${name} compiled SEF differs from the tracked digest. Expected ${expected.sefSha256}, got ${actual}. Review the compiler and output before repinning.`);
  }
}
writeFileSync(stampPath, `${JSON.stringify({ compiler: lock.compiled.compiler, ...wanted }, null, 2)}\n`);

try {
  execFileSync("xmllint", ["--version"], { stdio: "ignore" });
} catch {
  console.warn("WARNING: xmllint not found on PATH. XSD validation needs libxml2 (macOS: preinstalled; Debian/Ubuntu: apt-get install libxml2-utils).");
}

console.log("Artefacts ready and checksums verified.");
