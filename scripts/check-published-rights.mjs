#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildInventory } from "../packages/conformance/src/inventory.js";

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

function decodedBase64Text(value) {
  const decoded = [];
  for (const match of String(value).matchAll(/(?<![A-Za-z0-9+/_-])([A-Za-z0-9+/_-]{24,}={0,2})(?![A-Za-z0-9+/_-])/g)) {
    const token = match[1];
    try {
      const normalized = token.replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Buffer.from(normalized, "base64");
      const text = decodeText(bytes);
      if (bytes.length >= 18 && text.length > 0 && [...text].filter((character) => /[\t\n\r\x20-\x7e]/.test(character)).length / text.length >= 0.9) {
        decoded.push(text);
      }
    } catch {
      // Ignore text that only resembles base64.
    }
  }
  return decoded.join("\n");
}

export function canonicalXPath(value) {
  let canonical = decodeEscapes(String(value)).replace(/\s+/g, "").trim();
  const enclosesWholeExpression = () => {
    if (!canonical.startsWith("(") || !canonical.endsWith(")")) return false;
    let depth = 0;
    let quote = "";
    for (let index = 0; index < canonical.length; index += 1) {
      const character = canonical[index];
      if (quote) {
        if (character === quote) quote = "";
        continue;
      }
      if (character === "'" || character === '"') quote = character;
      else if (character === "(") depth += 1;
      else if (character === ")" && --depth === 0) return index === canonical.length - 1;
    }
    return false;
  };
  while (enclosesWholeExpression()) canonical = canonical.slice(1, -1);
  return canonical;
}

function functionFragments(value) {
  const fragments = [];
  for (const match of value.matchAll(/[A-Za-z][\w-]*\s*\(/g)) {
    const start = match.index;
    let depth = 0;
    let quote = "";
    for (let index = value.indexOf("(", start); index < value.length; index += 1) {
      const character = value[index];
      if (quote) {
        if (character === quote) quote = "";
        continue;
      }
      if (character === "'" || character === '"') quote = character;
      else if (character === "(") depth += 1;
      else if (character === ")" && --depth === 0) {
        fragments.push(value.slice(start, index + 1));
        break;
      }
    }
  }
  return fragments;
}

function xpathSignatures(entries) {
  const signatures = [];
  for (const entry of entries) {
      if (typeof entry.value !== "string" || !/[()[\]=<>|]/.test(entry.value)) continue;
      for (const candidate of [entry.value, ...functionFragments(entry.value)]) {
        const canonical = canonicalXPath(candidate);
        if (canonical.length < 24 || !/[()[\]=<>|]/.test(canonical)) continue;
        signatures.push({ ruleId: entry.ruleId, kind: entry.kind, canonical });
      }
  }
  return [...new Map(signatures.map((entry) => [`${entry.kind}\0${entry.canonical}`, entry])).values()];
}

export function protectedXPathSignatures(inventory) {
  return xpathSignatures(inventory.rules.flatMap((rule) => [
    { ruleId: rule.id, kind: "assertion", value: rule.test },
    { ruleId: rule.id, kind: "context", value: rule.context },
  ]));
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
  const xpathPatterns = xpathSignatures(phrases.filter((phrase) => phrase.kind !== "message"));
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
    const rawText = decodeText(bytes);
    const text = decodeEscapes(`${rawText}\n${decodedBase64Text(rawText)}`);
    const normalized = normalizedText(text);
    const exact = longPhrases.find((phrase) => normalized.includes(normalizedText(phrase.value)));
    if (exact) {
      problems.push(`${relative(repoRoot, path)}: exact official ${exact.ruleId} ${exact.kind}`);
      continue;
    }
    const xpath = canonicalXPath(text);
    const equivalent = xpathPatterns.find((signature) => xpath.includes(signature.canonical));
    if (equivalent) {
      problems.push(`${relative(repoRoot, path)}: formatting-equivalent official ${equivalent.ruleId} ${equivalent.kind}`);
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

export function trackedFiles(repoRoot = defaultRepoRoot) {
  const output = execFileSync("git", ["-C", repoRoot, "ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return output
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((path) => join(repoRoot, path));
}

function lifecycleProblems(repoRoot, packageDirectory, manifest) {
  const scanner = relative(packageDirectory, join(repoRoot, "scripts/check-published-rights.mjs")).split(sep).join("/");
  const command = `node ${scanner} --package .`;
  return ["prepack", "prepublishOnly"]
    .filter((name) => {
      const steps = String(manifest.scripts?.[name] ?? "")
        .split(/\s*&&\s*/)
        .map((step) => step.trim())
        .filter(Boolean);
      return steps.at(-1) !== command;
    })
    .map((name) => `${relative(repoRoot, packageDirectory)}/package.json: public package ${name} must finish with the rights check as its final && command`);
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
  tracked = false,
  verifyFingerprints = false,
  inventory,
  loadInventory = buildInventory,
} = {}) {
  if ([packageDirectory, siteDirectory, tracked].filter(Boolean).length > 1) {
    throw new Error("use only one of --package, --site, or --tracked");
  }
  const transientInventory = inventory ?? loadInventory();
  const phrases = protectedPhrases(transientInventory);
  const fingerprints = fingerprintPolicy(repoRoot);
  const problems = [];
  const files = [];
  if (siteDirectory) {
    files.push(...siteFiles(resolve(siteDirectory)));
  } else if (tracked) {
    files.push(...trackedFiles(repoRoot));
  } else if (packageDirectory) {
    const manifest = readJson(join(resolve(packageDirectory), "package.json"));
    if (!manifest.private) files.push(...npmPackFiles(resolve(packageDirectory)));
  } else {
    const directories = workspacePackageDirectories(repoRoot);
    for (const directory of directories) {
      const manifest = readJson(join(directory, "package.json"));
      if (manifest.private) continue;
      problems.push(...lifecycleProblems(repoRoot, directory, manifest));
      files.push(...npmPackFiles(directory));
    }
    files.push(...trackedFiles(repoRoot));
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
      tracked: process.argv.includes("--tracked"),
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
