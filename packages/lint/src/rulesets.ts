import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { homedir } from "node:os";
import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { inflateRawSync } from "node:zlib";
import {
  RULESET_NAME,
  RULESET_DIGEST,
  RULESET_VERSION,
  type InstalledRuleset,
  type RulesetInstallOptions,
} from "./types.js";

const require = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);

export const RULESET_PROVENANCE = {
  version: RULESET_VERSION,
  specification: "https://docs.peppol.eu/poac/aunz/pint-aunz/",
  resources: {
    url: "https://docs.peppol.eu/poac/aunz/pint-aunz/resources.zip",
    sha256: RULESET_DIGEST,
  },
  ubl: {
    url: "https://docs.oasis-open.org/ubl/os-UBL-2.1/UBL-2.1.zip",
    sha256: "60b80d76394a8a2add90723ecb8e0e2e9d826775de9749df37a72d60703f86ed",
  },
  files: {
    "resources/trn-invoice/schematron/PINT-UBL-validation-preprocessed.xslt":
      "14da33f835748e8c23bf14ae15a4e80bf3134033fe7e35c5dec43c560831c9d1",
    "resources/trn-invoice/schematron/PINT-jurisdiction-aligned-rules.xslt":
      "109989ddd7ffcf5ee230496633aa3f0918de5fa0283fb2476c5e0afb282818e7",
  },
} as const;

const MANIFEST = "ruleset.json";
const MAX_ARCHIVE_BYTES = 128 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 256 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 60_000;
const resolvedRulesetCache = new Map<string, Promise<string>>();

async function* streamBytes(response: Response): AsyncGenerator<Uint8Array> {
  const body = response.body;
  if (!body) {
    const buffer = await response.arrayBuffer();
    yield new Uint8Array(buffer);
    return;
  }
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

export function defaultCacheDirectory(): string {
  return process.env.PINT_ANZ_CACHE_DIR
    ? resolve(process.env.PINT_ANZ_CACHE_DIR)
    : join(homedir(), ".cache", "pint-anz", "rulesets");
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function versionDirectory(cacheDirectory = defaultCacheDirectory()): string {
  return join(cacheDirectory, RULESET_VERSION);
}

async function archiveBytes(
  localPath: string | undefined,
  url: string,
  expected: string,
  offline: boolean,
): Promise<Buffer> {
  let bytes: Buffer;
  if (localPath) {
    bytes = await readFile(localPath);
  } else {
    if (offline) throw new Error(`Offline installation requires a local archive for ${url}.`);
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Cannot download ${url}: HTTP ${response.status}.`);
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_ARCHIVE_BYTES) throw new Error(`${url} exceeds the archive size limit.`);
    // Stream the body so a missing/spoofed content-length cannot force us to
    // buffer an unbounded response before the size check below.
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of streamBytes(response)) {
      total += chunk.byteLength;
      if (total > MAX_ARCHIVE_BYTES) throw new Error(`${url} exceeds the archive size limit.`);
      chunks.push(Buffer.from(chunk));
    }
    bytes = Buffer.concat(chunks);
  }
  if (bytes.length > MAX_ARCHIVE_BYTES) throw new Error(`Archive exceeds ${MAX_ARCHIVE_BYTES} bytes.`);
  const actual = sha256(bytes);
  if (actual !== expected) {
    throw new Error(`Archive checksum mismatch: expected ${expected}, received ${actual}.`);
  }
  return bytes;
}

interface ZipEntry {
  name: string;
  flags: number;
  method: number;
  compressedSize: number;
  size: number;
  localOffset: number;
  mode: number;
}

function zipEntries(archive: Buffer): ZipEntry[] {
  const minimum = Math.max(0, archive.length - 65_557);
  let eocd = -1;
  for (let offset = archive.length - 22; offset >= minimum; offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("Archive has no ZIP end-of-directory record.");
  const count = archive.readUInt16LE(eocd + 10);
  let offset = archive.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    if (archive.readUInt32LE(offset) !== 0x02014b50) throw new Error("Invalid ZIP directory entry.");
    const flags = archive.readUInt16LE(offset + 8);
    const method = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const size = archive.readUInt32LE(offset + 24);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const mode = archive.readUInt32LE(offset + 38) >>> 16;
    const localOffset = archive.readUInt32LE(offset + 42);
    const nameBytes = archive.subarray(offset + 46, offset + 46 + nameLength);
    const name = nameBytes.toString((flags & 0x800) !== 0 ? "utf8" : "latin1");
    if (!name || name.includes("\0") || name.includes("\\") || isAbsolute(name)) {
      throw new Error(`Unsafe ZIP entry: ${JSON.stringify(name)}.`);
    }
    const parts = name.split("/");
    if (parts.some((part) => part === ".." || part === ".") || /^[A-Za-z]:/.test(name)) {
      throw new Error(`Unsafe ZIP entry: ${JSON.stringify(name)}.`);
    }
    if ((flags & 1) !== 0) throw new Error(`Encrypted ZIP entry is unsupported: ${name}.`);
    if (![0, 8].includes(method)) throw new Error(`Unsupported ZIP compression method ${method}: ${name}.`);
    if ((mode & 0o170000) === 0o120000) throw new Error(`Symbolic links are forbidden in archives: ${name}.`);
    entries.push({ name, flags, method, compressedSize, size, localOffset, mode });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function extractZip(
  archive: Buffer,
  destination: string,
  include: (name: string) => boolean = () => true,
): Promise<void> {
  const destinationRoot = `${resolve(destination)}${sep}`;
  let extractedBytes = 0;
  for (const entry of zipEntries(archive)) {
    if (!include(entry.name)) continue;
    extractedBytes += entry.size;
    if (extractedBytes > MAX_EXTRACTED_BYTES) {
      throw new Error("Archive exceeds the extracted size limit.");
    }
    const target = resolve(destination, entry.name);
    if (!`${target}${entry.name.endsWith("/") ? sep : ""}`.startsWith(destinationRoot)) {
      throw new Error(`ZIP entry escapes its destination: ${entry.name}.`);
    }
    if (entry.name.endsWith("/")) {
      await mkdir(target, { recursive: true });
      continue;
    }
    if (archive.readUInt32LE(entry.localOffset) !== 0x04034b50) {
      throw new Error(`Invalid local ZIP header: ${entry.name}.`);
    }
    const nameLength = archive.readUInt16LE(entry.localOffset + 26);
    const extraLength = archive.readUInt16LE(entry.localOffset + 28);
    const start = entry.localOffset + 30 + nameLength + extraLength;
    const compressed = archive.subarray(start, start + entry.compressedSize);
    const bytes = entry.method === 0 ? compressed : inflateRawSync(compressed);
    if (bytes.length !== entry.size) throw new Error(`ZIP size mismatch: ${entry.name}.`);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes, { mode: 0o644, flag: "wx" });
  }
}

async function hashFile(path: string): Promise<string> {
  return sha256(await readFile(path));
}

async function installedFileHashes(directory: string): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  async function visit(path: string, relativePath: string): Promise<void> {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      const relativeChild = join(relativePath, entry.name).split(sep).join("/");
      if (entry.isDirectory()) await visit(child, relativeChild);
      else if (entry.isFile()) hashes[relativeChild] = await hashFile(child);
    }
  }
  await visit(join(directory, "ubl-2.1", "xsd"), "ubl-2.1/xsd");
  for (const relative of Object.keys(RULESET_PROVENANCE.files)) {
    hashes[relative] = await hashFile(join(directory, relative));
  }
  await visit(join(directory, "sef"), "sef");
  return Object.fromEntries(Object.entries(hashes).sort(([left], [right]) => left.localeCompare(right, "en")));
}

async function compileRules(directory: string): Promise<void> {
  const sources = {
    pint: join(directory, "resources", "trn-invoice", "schematron", "PINT-UBL-validation-preprocessed.xslt"),
    aligned: join(directory, "resources", "trn-invoice", "schematron", "PINT-jurisdiction-aligned-rules.xslt"),
  };
  await mkdir(join(directory, "sef"), { recursive: true });
  for (const [name, source] of Object.entries(sources)) {
    await execFileAsync(process.execPath, [
      require.resolve("xslt3"),
      `-xsl:${source}`,
      `-export:${join(directory, "sef", `${name}.sef.json`)}`,
      "-nogo",
      "-relocate:on",
    ]);
  }
}

export async function resolveRulesetDirectory(
  explicitDirectory?: string,
  cacheDirectory?: string,
): Promise<string> {
  const directory = explicitDirectory ? resolve(explicitDirectory) : versionDirectory(cacheDirectory);
  let verified = resolvedRulesetCache.get(directory);
  if (!verified) {
    verified = verifyRuleset(directory, { allowLegacyDirectory: Boolean(explicitDirectory) })
      .then(() => directory)
      .catch((error: unknown) => {
        resolvedRulesetCache.delete(directory);
        throw error;
      });
    resolvedRulesetCache.set(directory, verified);
  }
  return verified;
}

export async function verifyRuleset(
  directory = versionDirectory(),
  options: { allowLegacyDirectory?: boolean } = {},
): Promise<InstalledRuleset> {
  const resolved = resolve(directory);
  const required = [
    join(resolved, "ubl-2.1", "xsd", "maindoc", "UBL-Invoice-2.1.xsd"),
    join(resolved, "ubl-2.1", "xsd", "maindoc", "UBL-CreditNote-2.1.xsd"),
    join(resolved, "sef", "pint.sef.json"),
    join(resolved, "sef", "aligned.sef.json"),
  ];
  await Promise.all(required.map((path) => access(path)));
  for (const [relative, expected] of Object.entries(RULESET_PROVENANCE.files)) {
    const actual = await hashFile(join(resolved, relative));
    if (actual !== expected) throw new Error(`${relative} failed checksum verification.`);
  }
  // Only a genuinely-absent manifest may fall back to the legacy shape. Read it
  // in its own try/catch so an ENOENT raised later — e.g. while hashing a
  // manifest-listed file that was deleted — fails verification instead of being
  // misread as "no manifest present" and fabricated into a legacy success.
  let manifestSource: string;
  try {
    manifestSource = await readFile(join(resolved, MANIFEST), "utf8");
  } catch (error) {
    if (options.allowLegacyDirectory && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        name: RULESET_NAME,
        version: RULESET_VERSION,
        directory: resolved,
        resourcesSha256: RULESET_PROVENANCE.resources.sha256,
        ublSha256: RULESET_PROVENANCE.ubl.sha256,
        installedAt: "unknown",
        files: {},
      };
    }
    throw error;
  }
  const manifest = JSON.parse(manifestSource) as InstalledRuleset;
  if (manifest.version !== RULESET_VERSION) throw new Error(`Expected ${RULESET_VERSION}, found ${manifest.version}.`);
  if (
    manifest.resourcesSha256 !== RULESET_PROVENANCE.resources.sha256 ||
    manifest.ublSha256 !== RULESET_PROVENANCE.ubl.sha256
  ) {
    throw new Error("Ruleset manifest provenance does not match the pinned archives.");
  }
  if (!manifest.files || Object.keys(manifest.files).length === 0) {
    throw new Error("Ruleset manifest has no extracted-file inventory.");
  }
  for (const [relative, expected] of Object.entries(manifest.files)) {
    const path = resolve(resolved, relative);
    if (!path.startsWith(`${resolved}${sep}`)) throw new Error(`Unsafe manifest path: ${relative}.`);
    const actual = await hashFile(path);
    if (actual !== expected) throw new Error(`${relative} failed installed-file verification.`);
  }
  return { ...manifest, directory: resolved };
}

export async function installRuleset(
  options: RulesetInstallOptions = {},
): Promise<InstalledRuleset> {
  const cache = resolve(options.cacheDirectory ?? defaultCacheDirectory());
  const finalDirectory = versionDirectory(cache);
  try {
    return await verifyRuleset(finalDirectory);
  } catch {
    // Missing or corrupt cache entries are replaced from pinned source bytes.
  }
  await mkdir(cache, { recursive: true });
  const temporary = join(cache, `.install-${RULESET_VERSION}-${randomUUID()}`);
  const backup = join(cache, `.backup-${RULESET_VERSION}-${randomUUID()}`);
  try {
    const [resources, ubl] = await Promise.all([
      archiveBytes(
        options.resourcesArchive,
        RULESET_PROVENANCE.resources.url,
        RULESET_PROVENANCE.resources.sha256,
        options.offline ?? false,
      ),
      archiveBytes(
        options.ublArchive,
        RULESET_PROVENANCE.ubl.url,
        RULESET_PROVENANCE.ubl.sha256,
        options.offline ?? false,
      ),
    ]);
    await mkdir(temporary, { recursive: true });
    await extractZip(resources, join(temporary, "resources"));
    await extractZip(ubl, join(temporary, "ubl-2.1"), (name) => name.startsWith("xsd/"));
    for (const [relative, expected] of Object.entries(RULESET_PROVENANCE.files)) {
      const actual = await hashFile(join(temporary, relative));
      if (actual !== expected) throw new Error(`${relative} failed checksum verification.`);
    }
    await compileRules(temporary);
    const installed: InstalledRuleset = {
      name: RULESET_NAME,
      version: RULESET_VERSION,
      directory: finalDirectory,
      resourcesSha256: RULESET_PROVENANCE.resources.sha256,
      ublSha256: RULESET_PROVENANCE.ubl.sha256,
      installedAt: new Date().toISOString(),
      files: await installedFileHashes(temporary),
    };
    await writeFile(join(temporary, MANIFEST), `${JSON.stringify(installed, null, 2)}\n`, "utf8");
    try {
      await rename(finalDirectory, backup);
    } catch {
      // No previous installation.
    }
    await rename(temporary, finalDirectory);
    await rm(backup, { recursive: true, force: true });
    return installed;
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    try {
      await rename(backup, finalDirectory);
    } catch {
      // No backup to restore.
    }
    throw error;
  }
}

export async function listInstalledRulesets(
  cacheDirectory = defaultCacheDirectory(),
): Promise<InstalledRuleset[]> {
  let names: string[];
  try {
    names = await readdir(cacheDirectory);
  } catch {
    return [];
  }
  const installed: InstalledRuleset[] = [];
  for (const name of names.sort()) {
    const directory = join(cacheDirectory, name);
    try {
      if ((await stat(directory)).isDirectory()) installed.push(await verifyRuleset(directory));
    } catch {
      // Ignore temporary, corrupt, and unrelated directories in listings.
    }
  }
  return installed;
}
