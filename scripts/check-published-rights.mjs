#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const defaultRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const prohibitedExtensions = new Set([".sch", ".xslt", ".xsl", ".xsd", ".zip", ".gc"]);
const prohibitedNames = new Set(["pint.sef.json", "aligned.sef.json", "resources.zip"]);
const metadataKeys = new Set(["test", "assertion", "xpath", "context"]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function decodeText(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  const evenNuls = bytes.filter((value, index) => value === 0 && index % 2 === 0).length;
  const oddNuls = bytes.filter((value, index) => value === 0 && index % 2 === 1).length;
  if (oddNuls > bytes.length / 8) return new TextDecoder("utf-16le").decode(bytes);
  if (evenNuls > bytes.length / 8) return new TextDecoder("utf-16be").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes);
}

function decodeEscapes(value) {
  return value
    .replace(/\\u\{([0-9a-f]+)\}/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function normalizedText(value) {
  return decodeEscapes(value)
    .replace(/<\/?[A-Za-z][^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Layout-insensitive fingerprint; not full W3C XML C14N. */
export function canonicalXml(value) {
  return decodeText(Buffer.isBuffer(value) ? value : Buffer.from(value))
    .replace(/^\uFEFF/, "")
    .replace(/<\?xml[^>]*\?>/i, "")
    .replace(/<!--[^]*?-->/g, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .replace(/\s*\/?>/g, (ending) => ending.trimStart())
    .trim();
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function protectedPhrases(inventory) {
  return inventory.rules.flatMap((rule) => {
    const message = String(rule.message ?? "").trim();
    const withoutId = message.replace(/^\[[^\]]+\]-?\s*/, "");
    const entries = [
      { kind: "assertion", value: rule.test },
      { kind: "message", value: message },
      { kind: "message", value: withoutId },
    ];
    if (/[\[\]|()=$]/.test(rule.context ?? "")) {
      entries.push({ kind: "context", value: rule.context });
    }
    return entries
      .filter((entry) => typeof entry.value === "string" && entry.value.trim())
      .map((entry) => ({ ...entry, ruleId: rule.id, value: entry.value.trim() }));
  });
}

function metadataValues(text) {
  const values = [];
  try {
    const visit = (value) => {
      if (Array.isArray(value)) return value.forEach(visit);
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        if (metadataKeys.has(key.toLowerCase()) && typeof child === "string") values.push(child);
        visit(child);
      }
    };
    visit(JSON.parse(text));
  } catch {
    // Non-JSON output is checked by the JS/object-literal expression below.
  }
  const pattern = /(?:["']?(?:test|assertion|xpath|context)["']?)\s*[:=]\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/gi;
  for (const match of text.matchAll(pattern)) values.push(decodeEscapes(match[2]));
  return values.map(normalizedText);
}

function fingerprintPolicy(repoRoot) {
  const lock = readJson(join(repoRoot, "packages/conformance/artefacts.lock.json"));
  const examples = readJson(join(repoRoot, "docs/licensing/official-example-fingerprints.json"));
  return {
    examples,
    raw: new Set([
      ...lock.downloads.map((download) => download.sha256),
      ...Object.values(lock.files),
      ...Object.values(examples.examples).map((entry) => entry.rawSha256),
    ]),
    canonicalXml: new Set(Object.values(examples.examples).map((entry) => entry.canonicalSha256)),
  };
}

export function inspectFiles(files, phrases, fingerprints, repoRoot = defaultRepoRoot) {
  const problems = [];
  const longPhrases = phrases.filter((phrase) => normalizedText(phrase.value).length >= 24);
  const shortMetadataPhrases = phrases
    .filter((phrase) => phrase.kind !== "message" && normalizedText(phrase.value).length < 24)
    .map((phrase) => ({ ...phrase, normalized: normalizedText(phrase.value) }));
  for (const path of files) {
    const lowerName = path.toLowerCase();
    const extension = extname(lowerName);
    if (
      prohibitedExtensions.has(extension) ||
      lowerName.endsWith(".sef.json") ||
      [...prohibitedNames].some((name) => lowerName.endsWith(name))
    ) {
      problems.push(`${relative(repoRoot, path)}: prohibited official artefact/source format`);
      continue;
    }
    const bytes = readFileSync(path);
    if (fingerprints.raw.has(sha256(bytes))) {
      problems.push(`${relative(repoRoot, path)}: byte-identical official archive, rule source, or example`);
      continue;
    }
    if (extension === ".xml" && fingerprints.canonicalXml.has(sha256(canonicalXml(bytes)))) {
      problems.push(`${relative(repoRoot, path)}: reformatted official XML example`);
      continue;
    }
    const text = decodeEscapes(decodeText(bytes));
    const normalized = normalizedText(text);
    const exact = longPhrases.find((phrase) => normalized.includes(normalizedText(phrase.value)));
    if (exact) {
      problems.push(`${relative(repoRoot, path)}: exact official ${exact.ruleId} ${exact.kind}`);
      continue;
    }
    const metadata = metadataValues(text);
    const short = shortMetadataPhrases.find((phrase) => metadata.includes(phrase.normalized));
    if (short) problems.push(`${relative(repoRoot, path)}: exact short official ${short.ruleId} ${short.kind} in rule metadata`);
  }
  return problems;
}

function workspacePatterns(repoRoot) {
  const contents = readFileSync(join(repoRoot, "pnpm-workspace.yaml"), "utf8");
  const lines = contents.split(/\r?\n/);
  const start = lines.findIndex((line) => /^packages:\s*$/.test(line));
  if (start < 0) throw new Error("pnpm-workspace.yaml has no packages list");
  const patterns = [];
  for (const line of lines.slice(start + 1)) {
    const match = line.match(/^\s+-\s+(.+?)\s*$/);
    if (match) patterns.push(match[1].replace(/^['"]|['"]$/g, ""));
    else if (/^\S/.test(line) && line.trim()) break;
  }
  if (!patterns.length) throw new Error("pnpm-workspace.yaml packages list is empty");
  return patterns;
}

function expandWorkspacePattern(repoRoot, pattern) {
  const segments = pattern.split("/");
  let paths = [repoRoot];
  for (const segment of segments) {
    paths = paths.flatMap((base) => {
      if (segment === "*") {
        if (!existsSync(base)) return [];
        return readdirSync(base, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => join(base, entry.name));
      }
      if (/[*?\[\]]/.test(segment)) throw new Error(`unsupported workspace glob: ${pattern}`);
      return [join(base, segment)];
    });
  }
  return paths.filter((path) => existsSync(join(path, "package.json")));
}

export function workspacePackageDirectories(repoRoot = defaultRepoRoot) {
  return [...new Set(workspacePatterns(repoRoot).flatMap((pattern) => expandWorkspacePattern(repoRoot, pattern)))];
}

export function npmPackFiles(packageDirectory) {
  const output = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    cwd: packageDirectory,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const report = JSON.parse(output)[0];
  if (!report?.files?.length) throw new Error(`${packageDirectory}: npm pack returned no files`);
  return report.files.map((entry) => {
    const path = resolve(packageDirectory, entry.path);
    if (!path.startsWith(`${resolve(packageDirectory)}${sep}`) && path !== resolve(packageDirectory)) {
      throw new Error(`${packageDirectory}: npm pack returned path outside package: ${entry.path}`);
    }
    return path;
  });
}

function lifecycleProblems(repoRoot, packageDirectory, manifest) {
  const command = "check-published-rights.mjs --package .";
  return ["prepack", "prepublishOnly"]
    .filter((name) => !String(manifest.scripts?.[name] ?? "").includes(command))
    .map((name) => `${relative(repoRoot, packageDirectory)}/package.json: public package ${name} must run the rights check`);
}

function siteFiles(siteDirectory) {
  if (!existsSync(siteDirectory) || !statSync(siteDirectory).isDirectory()) {
    throw new Error(`site output is missing: ${siteDirectory}`);
  }
  const visit = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? visit(path) : [path];
  });
  const files = visit(siteDirectory);
  if (!files.length) throw new Error(`site output is empty: ${siteDirectory}`);
  return files;
}

export function verifyExampleFingerprints(repoRoot = defaultRepoRoot) {
  const policy = fingerprintPolicy(repoRoot).examples;
  const resourcesRoot = join(repoRoot, "artefacts/resources");
  const examples = ["trn-invoice/example", "trn-creditnote/example"].flatMap((directory) => {
    const root = join(resourcesRoot, directory);
    if (!existsSync(root)) throw new Error(`pinned example directory is missing: ${root}`);
    return readdirSync(root)
      .filter((name) => name.endsWith(".xml"))
      .map((name) => ({ name: `${directory}/${name}`, path: join(root, name) }));
  });
  const expected = Object.keys(policy.examples).sort();
  const actual = examples.map((example) => example.name).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`official example fingerprint set differs from pinned archive\nexpected: ${expected.join(", ")}\nactual: ${actual.join(", ")}`);
  }
  for (const example of examples) {
    const bytes = readFileSync(example.path);
    const record = policy.examples[example.name];
    if (sha256(bytes) !== record.rawSha256 || sha256(canonicalXml(bytes)) !== record.canonicalSha256) {
      throw new Error(`${example.name}: official example fingerprint drift`);
    }
  }
  return examples.length;
}

export function checkPublishedRights({
  repoRoot = defaultRepoRoot,
  packageDirectory,
  siteDirectory,
  verifyFingerprints = false,
} = {}) {
  if (packageDirectory && siteDirectory) throw new Error("use either --package or --site, not both");
  const inventory = readJson(join(repoRoot, "packages/conformance/rule-inventory.json"));
  const phrases = protectedPhrases(inventory);
  const fingerprints = fingerprintPolicy(repoRoot);
  const problems = [];
  const files = [];
  if (siteDirectory) {
    files.push(...siteFiles(resolve(siteDirectory)));
  } else {
    const directories = packageDirectory ? [resolve(packageDirectory)] : workspacePackageDirectories(repoRoot);
    for (const directory of directories) {
      const manifest = readJson(join(directory, "package.json"));
      if (manifest.private) continue;
      if (!packageDirectory) problems.push(...lifecycleProblems(repoRoot, directory, manifest));
      files.push(...npmPackFiles(directory));
    }
  }
  if (verifyFingerprints) verifyExampleFingerprints(repoRoot);
  problems.push(...inspectFiles(files, phrases, fingerprints, repoRoot));
  return { files, problems };
}

function optionValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  if (!process.argv[index + 1]) throw new Error(`${name} requires a path`);
  return resolve(process.cwd(), process.argv[index + 1]);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const result = checkPublishedRights({
      packageDirectory: optionValue("--package"),
      siteDirectory: optionValue("--site"),
      verifyFingerprints: process.argv.includes("--verify-fingerprints"),
    });
    if (result.problems.length) {
      console.error(`Published-content rights check failed:\n- ${result.problems.join("\n- ")}`);
      process.exit(1);
    }
    console.log(`Published-content rights check passed (${result.files.length} files inspected).`);
  } catch (error) {
    console.error(`Published-content rights check failed: ${error.message}`);
    process.exit(1);
  }
}
