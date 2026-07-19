import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildInventory } from "../packages/conformance/src/inventory.js";
import {
  canonicalXml,
  checkPublishedRights,
  defaultRepoRoot,
  inspectFiles,
  protectedPhrases,
  trackedFiles,
  verifyExampleFingerprints,
  workspacePackageDirectories,
} from "./check-published-rights.mjs";

const LONG_MESSAGE = "[ibr-example]-An invoice MUST contain an example identifier.";
const inventory = {
  rules: [
    { id: "ibr-example", test: "exists(cbc:ExampleIdentifier)", context: "/Invoice", message: LONG_MESSAGE },
    { id: "ibr-short", test: "short()", context: "/Invoice", message: "[ibr-short]-Never valid." },
  ],
};
const emptyFingerprints = { raw: new Set(), canonicalXml: new Set() };

function write(path, contents) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, contents);
}

function temporaryFile(name, contents, encoding) {
  const directory = mkdtempSync(join(tmpdir(), "pint-anz-rights-file-"));
  const path = join(directory, name);
  writeFileSync(path, contents, encoding);
  return path;
}

function testRepo() {
  const root = mkdtempSync(join(tmpdir(), "pint-anz-rights-repo-"));
  execFileSync("git", ["init", "-q", root]);
  write(join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n");
  write(join(root, "packages/conformance/rule-inventory.json"), JSON.stringify({
    rules: inventory.rules.map(({ id }) => ({ id, ruleset: "pint", family: "test", kind: "assert", severity: "fatal" })),
  }));
  write(join(root, "packages/conformance/artefacts.lock.json"), JSON.stringify({ downloads: [], files: {} }));
  write(join(root, "docs/licensing/official-example-fingerprints.json"), JSON.stringify({ examples: {} }));
  return root;
}

function addPackage(root, name, { privatePackage = false, contents = "export {};\n", lifecycle = true } = {}) {
  const directory = join(root, "packages", name);
  const rights = "node ../../scripts/check-published-rights.mjs --package .";
  write(join(directory, "package.json"), JSON.stringify({
    name,
    version: "0.0.0",
    private: privatePackage,
    files: ["index.js"],
    scripts: lifecycle ? { prepack: rights, prepublishOnly: rights } : {},
  }));
  write(join(directory, "index.js"), contents);
  return directory;
}

test("uses pnpm workspace membership and npm's actual pack file list while skipping private packages", () => {
  const root = testRepo();
  const publicDirectory = addPackage(root, "public-package");
  addPackage(root, "private-package", { privatePackage: true });
  assert.equal(workspacePackageDirectories(root).length, 2);
  const result = checkPublishedRights({ repoRoot: root, inventory });
  assert.deepEqual(result.problems, []);
  assert(result.files.includes(join(publicDirectory, "index.js")));
});

test("high-level package check detects contamination in the actual npm pack", () => {
  const root = testRepo();
  const directory = addPackage(root, "contaminated", { contents: LONG_MESSAGE });
  const result = checkPublishedRights({ repoRoot: root, packageDirectory: directory, inventory });
  assert.equal(result.problems.length, 1);
  assert(result.files.some((path) => path.endsWith("index.js")));
});

test("default release scan catches ignored generated output included by npm pack", () => {
  const root = testRepo();
  const directory = addPackage(root, "generated-contamination");
  const manifestPath = join(directory, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.files = ["dist"];
  write(manifestPath, JSON.stringify(manifest));
  write(join(root, ".gitignore"), "dist/\n");
  write(join(directory, "dist/index.js"), LONG_MESSAGE);
  assert(!trackedFiles(root).includes(join(directory, "dist/index.js")));
  const result = checkPublishedRights({ repoRoot: root, inventory });
  assert(result.files.includes(join(directory, "dist/index.js")));
  assert(result.problems.some((problem) => problem.includes("generated-contamination/dist/index.js")));
});

test("root check rejects a public package missing either publication lifecycle gate", () => {
  const root = testRepo();
  addPackage(root, "ungated", { lifecycle: false });
  const result = checkPublishedRights({ repoRoot: root, inventory });
  assert.equal(result.problems.filter((problem) => problem.includes("must finish with the rights check")).length, 2);
});

test("real npm lifecycle scans after build output changes without recursing", () => {
  const directory = mkdtempSync(join(tmpdir(), "pint-anz-rights-lifecycle-"));
  const scanner = join(defaultRepoRoot, "scripts/check-published-rights.mjs");
  const protectedMessage = buildInventory().rules[0].message;
  write(join(directory, "build.mjs"), [
    'import { mkdirSync, writeFileSync } from "node:fs";',
    'mkdirSync("dist", { recursive: true });',
    `writeFileSync("dist/index.js", ${JSON.stringify(protectedMessage)});`,
  ].join("\n"));
  write(join(directory, "package.json"), JSON.stringify({
    name: "lifecycle-contamination-test",
    version: "0.0.0",
    files: ["dist"],
    scripts: {
      prepack: `node build.mjs && node ${JSON.stringify(scanner)} --package .`,
      prepublishOnly: `node ${JSON.stringify(scanner)} --package .`,
    },
  }));

  assert.throws(
    () => execFileSync("npm", ["pack", "--dry-run", "--json"], {
      cwd: directory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
    /Command failed/,
  );
  assert.equal(readFileSync(join(directory, "dist/index.js"), "utf8"), protectedMessage);
});

test("every discovered public package lifecycle finishes with the rights check", () => {
  for (const directory of workspacePackageDirectories(defaultRepoRoot)) {
    const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
    if (manifest.private) continue;
    for (const lifecycle of ["prepack", "prepublishOnly"]) {
      assert.match(manifest.scripts[lifecycle], /node \.\.\/\.\.\/scripts\/check-published-rights\.mjs --package \.$/);
    }
  }
});

test("rejects post-scan lifecycle commands in any newly discovered public package", () => {
  const root = testRepo();
  const directory = addPackage(root, "future-package");
  const manifestPath = join(directory, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.scripts.prepack += " && node contaminate-after-scan.mjs";
  write(manifestPath, JSON.stringify(manifest));
  const result = checkPublishedRights({ repoRoot: root, inventory });
  assert(result.problems.some((problem) => problem.includes("future-package/package.json") && problem.includes("final && command")));
});

test("explicit site mode rejects missing and empty outputs, and scans populated output", () => {
  const root = testRepo();
  const site = join(root, "site-dist");
  assert.throws(() => checkPublishedRights({ repoRoot: root, siteDirectory: site, inventory }), /site output is missing/);
  mkdirSync(site);
  assert.throws(() => checkPublishedRights({ repoRoot: root, siteDirectory: site, inventory }), /site output is empty/);
  write(join(site, "index.html"), "<p>Independent interpretation.</p>");
  assert.deepEqual(checkPublishedRights({ repoRoot: root, siteDirectory: site, inventory }).problems, []);
  write(join(site, "bad.html"), `<p>${LONG_MESSAGE}</p>`);
  assert.equal(checkPublishedRights({ repoRoot: root, siteDirectory: site, inventory }).problems.length, 1);
});

test("tracked mode scans indexed and non-ignored candidate files", () => {
  const root = testRepo();
  const path = join(root, "docs", "copied.md");
  write(path, LONG_MESSAGE);
  execFileSync("git", ["-C", root, "add", "docs/copied.md"]);
  assert(trackedFiles(root).includes(path));
  const result = checkPublishedRights({ repoRoot: root, tracked: true, inventory });
  assert.equal(result.problems.length, 1);
  assert.match(result.problems[0], /docs\/copied\.md: exact official ibr-example message/);
});

test("the actual tracked repository contains no protected official expression", () => {
  const result = checkPublishedRights({ repoRoot: defaultRepoRoot, tracked: true });
  assert.deepEqual(result.problems, []);
  assert(result.files.length > 700);
});

test("fails before scanning when official artefacts are missing or drifted", () => {
  for (const message of ["Pinned artefact checksum drift: missing", "Pinned artefact checksum drift: expected a, got b"]) {
    assert.throws(
      () => checkPublishedRights({
        repoRoot: testRepo(),
        tracked: true,
        loadInventory: () => { throw new Error(message); },
      }),
      new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
});

test("decodes numeric HTML entities and JSON/JS Unicode escapes", () => {
  const encodedHtml = temporaryFile("encoded.html", "An invoice MUST contain an example identifi&#101;r.");
  const encodedJs = temporaryFile("encoded.js", "An invoice MUST contain an example identifi\\u0065r.");
  for (const path of [encodedHtml, encodedJs]) {
    assert.equal(inspectFiles([path], protectedPhrases(inventory), emptyFingerprints).length, 1);
  }
});

test("inspects UTF-16LE and UTF-16BE text instead of skipping NUL bytes", () => {
  const utf16le = temporaryFile("le.txt", Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(LONG_MESSAGE, "utf16le")]));
  const swapped = Buffer.from(LONG_MESSAGE, "utf16le");
  for (let index = 0; index < swapped.length; index += 2) [swapped[index], swapped[index + 1]] = [swapped[index + 1], swapped[index]];
  const utf16be = temporaryFile("be.txt", Buffer.concat([Buffer.from([0xfe, 0xff]), swapped]));
  for (const path of [utf16le, utf16be]) {
    assert.equal(inspectFiles([path], protectedPhrases(inventory), emptyFingerprints).length, 1);
  }
});

test("protects short assertions in rule metadata without flagging ordinary prose", () => {
  const metadata = temporaryFile("rules.json", JSON.stringify({ test: "short()" }));
  const codeMetadata = temporaryFile("rules.js", "export const rule = { assertion: 'short()' };\n");
  const prose = temporaryFile("notes.txt", "The expression short() is discussed here.");
  assert.equal(inspectFiles([metadata], protectedPhrases(inventory), emptyFingerprints).length, 1);
  assert.equal(inspectFiles([codeMetadata], protectedPhrases(inventory), emptyFingerprints).length, 1);
  assert.deepEqual(inspectFiles([prose], protectedPhrases(inventory), emptyFingerprints), []);
});

test("detects protected XPath fragments despite whitespace and redundant-parenthesis formatting", () => {
  const official = buildInventory();
  const selected = ["aligned-ibrp-018", "aligned-ibrp-005", "ibr-sr-46"]
    .map((id) => official.rules.find((rule) => rule.id === id));
  assert(selected.every(Boolean), "reviewer-selected rules exist in the checksum-verified inventory");
  const variants = [selected[0].test, selected[1].context, selected[2].test].map((expression) =>
    `(( ${expression.replace(/([/()\[\]<>]=?)/g, " $1 ").replace(/\s+/g, " ")} ))`,
  );
  const xpathInventory = { rules: selected };
  for (const [name, value] of [["payee.txt", variants[0]], ["amount.txt", variants[1]], ["cardinality.txt", variants[2]]]) {
    const path = temporaryFile(name, `Independent evidence quotes ${value}.`);
    assert.equal(inspectFiles([path], protectedPhrases(xpathInventory), emptyFingerprints).length, 1, name);
  }
});

test("rejects base64-obscured protected content without storing an encoded official fixture", () => {
  const encodedMessage = temporaryFile("encoded-message.txt", Buffer.from(LONG_MESSAGE).toString("base64"));
  const encodedExpression = temporaryFile(
    "encoded-expression.txt",
    Buffer.from("exists ( cbc:ExampleIdentifier )").toString("base64"),
  );
  for (const path of [encodedMessage, encodedExpression]) {
    assert.equal(inspectFiles([path], protectedPhrases(inventory), emptyFingerprints).length, 1);
  }
});

test("does not treat ordinary synthetic XML paths as XPath expressions", () => {
  const path = temporaryFile("fixture.xml", "<cac:Party><cbc:ID>synthetic</cbc:ID></cac:Party>");
  assert.deepEqual(inspectFiles([path], protectedPhrases(inventory), emptyFingerprints), []);
});

test("canonical XML fingerprint rejects a reformatted official example", () => {
  const original = "<?xml version=\"1.0\"?><Invoice><ID>official</ID></Invoice>";
  const reformatted = "<?xml version=\"1.0\"?>\n<Invoice>\n  <ID>official</ID>\n</Invoice>\n";
  const path = temporaryFile("renamed.xml", reformatted);
  const canonicalDigest = createHash("sha256").update(canonicalXml(original)).digest("hex");
  const fingerprints = { raw: new Set(), canonicalXml: new Set([canonicalDigest]) };
  assert.equal(inspectFiles([path], protectedPhrases(inventory), fingerprints).length, 1);
});

test("named fingerprint verification is complete and fails when a record is weakened", () => {
  assert.equal(verifyExampleFingerprints(defaultRepoRoot), 19);
  const root = testRepo();
  const invoicePath = join(root, "artefacts/resources/trn-invoice/example/one.xml");
  const creditPath = join(root, "artefacts/resources/trn-creditnote/example/two.xml");
  write(invoicePath, "<Invoice><ID>one</ID></Invoice>");
  write(creditPath, "<CreditNote><ID>two</ID></CreditNote>");
  const record = (path) => ({
    rawSha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
    canonicalSha256: createHash("sha256").update(canonicalXml(readFileSync(path))).digest("hex"),
  });
  const policyPath = join(root, "docs/licensing/official-example-fingerprints.json");
  write(policyPath, JSON.stringify({ examples: {
    "trn-invoice/example/one.xml": record(invoicePath),
    "trn-creditnote/example/two.xml": record(creditPath),
  } }));
  assert.equal(verifyExampleFingerprints(root), 2);
  write(policyPath, JSON.stringify({ examples: { "trn-invoice/example/one.xml": record(invoicePath) } }));
  assert.throws(() => verifyExampleFingerprints(root), /fingerprint set differs/);
  rmSync(root, { recursive: true, force: true });
});
