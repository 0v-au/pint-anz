import { fileURLToPath } from "node:url";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  installRuleset,
  listInstalledRulesets,
  verifyRuleset,
} from "../src/index.js";

const artefacts = fileURLToPath(new URL("../../../artefacts/", import.meta.url));

describe("ruleset cache", () => {
  it("installs pinned local archives for fully offline validation", async () => {
    const cacheDirectory = await mkdtemp(join(tmpdir(), "pint-anz-rulesets-"));
    try {
      const installed = await installRuleset({
        cacheDirectory,
        resourcesArchive: join(artefacts, "resources.zip"),
        ublArchive: join(artefacts, "UBL-2.1.zip"),
        offline: true,
      });
      expect(installed).toMatchObject({ version: "1.1.2", directory: join(cacheDirectory, "1.1.2") });
      await expect(verifyRuleset(installed.directory)).resolves.toMatchObject({ version: "1.1.2" });
      await expect(listInstalledRulesets(cacheDirectory)).resolves.toHaveLength(1);
    } finally {
      await rm(cacheDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("rejects archive bytes that do not match the pinned digest", async () => {
    const directory = await mkdtemp(join(tmpdir(), "pint-anz-bad-ruleset-"));
    const archive = join(directory, "resources.zip");
    try {
      await writeFile(archive, "not the official archive");
      await expect(
        installRuleset({
          cacheDirectory: join(directory, "cache"),
          resourcesArchive: archive,
          ublArchive: join(artefacts, "UBL-2.1.zip"),
          offline: true,
        }),
      ).rejects.toThrow("checksum mismatch");
      expect(await readFile(archive, "utf8")).toBe("not the official archive");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
