// Builds the committed GitHub Action distributable:
//   dist/index.cjs          single-file bundle of src/main.ts and @pint-anz/lint
//   dist/node_modules/...   vendored runtime dependency closure of the packages
//                           in VENDORED_ROOTS, which cannot be inlined
// With --check the build goes to a temporary directory and is compared
// byte-for-byte against the committed dist, so CI can prove freshness.
import { build } from "esbuild";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(packageRoot, "..", "..");
const lintRoot = resolve(packageRoot, "..", "lint");
// Resolved from @pint-anz/lint, whose lockfile entry pins them. These stay
// real packages beside the bundle: saxon-js is loaded through createRequire,
// xslt3 runs as a subprocess, and xmllint-wasm spawns a worker script and
// loads a .wasm file from its own package directory.
const VENDORED_ROOTS = ["saxon-js", "xslt3", "xmllint-wasm"];

async function bundle(outputRoot) {
  await build({
    entryPoints: [join(packageRoot, "src", "main.ts")],
    outfile: join(outputRoot, "index.cjs"),
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    external: ["xmllint-wasm"],
    // @pint-anz/lint calls createRequire(import.meta.url); point it at the bundle.
    define: { "import.meta.url": "IMPORT_META_URL" },
    banner: {
      js: 'const IMPORT_META_URL = require("node:url").pathToFileURL(__filename).toString();',
    },
    sourcemap: false,
    logLevel: "warning",
  });
}

function manifestName(directory) {
  try {
    return JSON.parse(readFileSync(join(directory, "package.json"), "utf8")).name;
  } catch {
    return undefined;
  }
}

function packageDirectory(fromDirectory, name) {
  // Exports maps often hide package.json from require.resolve, so locate the
  // dependency on disk: nested node_modules, then the pnpm store sibling
  // layout (.pnpm/<pkg>@<version>/node_modules/<dep>), then the workspace root.
  const candidates = [
    join(fromDirectory, "node_modules", ...name.split("/")),
    join(dirname(fromDirectory), ...name.split("/")),
    join(workspaceRoot, "node_modules", ...name.split("/")),
  ];
  for (const candidate of candidates) {
    try {
      const directory = realpathSync(candidate);
      if (manifestName(directory) === name) return directory;
    } catch {
      // Try the next layout.
    }
  }
  throw new Error(`Cannot locate the package root of ${name} from ${fromDirectory}.`);
}

function dependencyClosure() {
  const closure = new Map();
  const queue = VENDORED_ROOTS.map((name) => ({ name, fromDirectory: lintRoot }));
  while (queue.length > 0) {
    const { name, fromDirectory } = queue.shift();
    if (closure.has(name)) continue;
    const directory = packageDirectory(fromDirectory, name);
    closure.set(name, directory);
    const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
    for (const dependency of Object.keys(manifest.dependencies ?? {})) {
      queue.push({ name: dependency, fromDirectory: directory });
    }
  }
  return closure;
}

function vendor(outputRoot) {
  for (const [name, directory] of dependencyClosure()) {
    cpSync(directory, join(outputRoot, "node_modules", name), {
      recursive: true,
      dereference: true,
      // Dependencies are vendored flat; nested node_modules only hold pnpm .bin links.
      filter: (source) => !relative(directory, source).split(sep).includes("node_modules"),
    });
  }
}

function listFiles(root, prefix = "") {
  const files = [];
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name, "en"),
  )) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...listFiles(root, path));
    else files.push(path);
  }
  return files;
}

function compare(expectedRoot, actualRoot) {
  let expected;
  let actual;
  try {
    actual = listFiles(actualRoot);
  } catch {
    return ["dist/ is missing"];
  }
  expected = listFiles(expectedRoot);
  const differences = [];
  const actualSet = new Set(actual);
  for (const path of expected) {
    if (!actualSet.has(path)) differences.push(`missing from dist: ${path}`);
    else if (!readFileSync(join(expectedRoot, path)).equals(readFileSync(join(actualRoot, path)))) {
      differences.push(`stale content: ${path}`);
    }
  }
  const expectedSet = new Set(expected);
  for (const path of actual) {
    if (!expectedSet.has(path)) differences.push(`unexpected file in dist: ${path}`);
  }
  return differences;
}

const checkMode = process.argv.includes("--check");
const committedDist = join(packageRoot, "dist");

if (checkMode) {
  const stagingRoot = mkdtempSync(join(tmpdir(), "pint-anz-lint-action-dist-"));
  try {
    await bundle(stagingRoot);
    vendor(stagingRoot);
    const differences = compare(stagingRoot, committedDist);
    if (differences.length > 0) {
      console.error(
        [
          "packages/lint-action/dist is stale:",
          ...differences.slice(0, 20).map((line) => `  ${line}`),
          differences.length > 20 ? `  ... and ${differences.length - 20} more` : "",
          "Run: pnpm --filter @pint-anz/lint-action build, then commit dist/.",
        ]
          .filter(Boolean)
          .join("\n"),
      );
      process.exitCode = 1;
    } else {
      console.log("packages/lint-action/dist matches a fresh build.");
    }
  } finally {
    rmSync(stagingRoot, { recursive: true, force: true });
  }
} else {
  rmSync(committedDist, { recursive: true, force: true });
  await bundle(committedDist);
  vendor(committedDist);
  console.log(`Built ${relative(process.cwd(), committedDist) || committedDist}.`);
}
