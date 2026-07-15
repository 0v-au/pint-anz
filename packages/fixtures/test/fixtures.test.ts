import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { XMLValidator } from "fast-xml-parser";
import { describe, expect, it } from "vitest";

import { fixtureUrl, manifest } from "../index.js";

const metadataPattern = /<!--\s*\n\s*fixture:\s*(\S+)\s*\n\s*expects:\s*(.+?)\s*\n\s*ruleset:\s*(\S+)\s*\n\s*notes:\s*(.+?)\s*\n\s*-->/s;

async function corpusFiles(directory: string): Promise<string[]> {
  return (await readdir(new URL(`../${directory}/`, import.meta.url)))
    .filter((file) => file.endsWith(".xml"))
    .map((file) => `./${directory}/${file}`);
}

function isValidAbn(value: string): boolean {
  if (!/^\d{11}$/.test(value)) return false;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const digits = [...value].map(Number);
  digits[0] -= 1;
  return digits.reduce((sum, digit, index) => sum + digit * weights[index], 0) % 89 === 0;
}

function isValidGln(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  const digits = [...value].map(Number);
  const sum = digits.slice(0, 12).reduce(
    (total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3),
    0,
  );
  return (10 - (sum % 10)) % 10 === digits[12];
}

describe("fixture manifest", () => {
  it("pins one ruleset version consistently", () => {
    expect(manifest.ruleset).toMatchObject({ version: "1.1.2", status: "active" });
    expect(new Set(manifest.fixtures.map((fixture) => fixture.rulesetVersion))).toEqual(
      new Set([manifest.ruleset.version]),
    );
  });

  it("has unique fixture IDs and paths", () => {
    const ids = manifest.fixtures.map((fixture) => fixture.id);
    const paths = manifest.fixtures.map((fixture) => fixture.path);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("indexes every corpus XML file exactly once", async () => {
    const files = (
      await Promise.all(["valid", "invalid", "malformed"].map(corpusFiles))
    ).flat().sort();
    expect(manifest.fixtures.map((fixture) => fixture.path).sort()).toEqual(files);
  });

  it("resolves fixture URLs and rejects unknown IDs", () => {
    expect(fileURLToPath(fixtureUrl("invoice-au-standard"))).toBe(
      fileURLToPath(new URL("../valid/invoice-au-standard.xml", import.meta.url)),
    );
    expect(() => fixtureUrl("missing")).toThrow(RangeError);
  });
});

describe("fixture documents", () => {
  for (const fixture of manifest.fixtures) {
    it(`${fixture.id} has matching metadata and XML expectations`, async () => {
      const contents = await readFile(fixtureUrl(fixture.id), "utf8");
      const metadata = contents.match(metadataPattern);
      expect(metadata, "metadata comment").not.toBeNull();
      expect(metadata?.[1]).toBe(fixture.id);
      expect(metadata?.[3]).toBe(fixture.rulesetVersion);

      if (fixture.expectation === "invalid") {
        expect(fixture.expectedRules).toHaveLength(1);
        expect(metadata?.[2]).toBe(`ERROR ${fixture.expectedRules[0]}`);
        expect(fixture.path).toContain(fixture.expectedRules[0]);
      } else {
        expect(fixture.expectedRules).toEqual([]);
        expect(metadata?.[2]).toBe(fixture.expectation === "valid" ? "VALID" : "MALFORMED XML");
      }

      const validation = XMLValidator.validate(contents);
      if (fixture.expectation === "malformed") {
        expect(validation).not.toBe(true);
      } else {
        expect(validation).toBe(true);
      }
    });
  }

  it("uses unique document IDs", async () => {
    const ids: string[] = [];
    for (const fixture of manifest.fixtures.filter((item) => item.expectation !== "malformed")) {
      const contents = await readFile(fixtureUrl(fixture.id), "utf8");
      const id = contents.match(/<(?:cbc:)?ID>([^<]+)<\/(?:cbc:)?ID>/)?.[1];
      expect(id).toBeDefined();
      ids.push(id!);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not contain the known real ABN previously used by the corpus", async () => {
    const forbidden = ["99000000000"];
    for (const fixture of manifest.fixtures) {
      const contents = await readFile(fixtureUrl(fixture.id), "utf8");
      for (const value of forbidden) expect(contents).not.toContain(value);
    }
  });
});

describe("synthetic party identifiers", () => {
  it.each(["47555222000", "91888222000"])("%s is a checksum-valid ABN", (abn) => {
    expect(isValidAbn(abn)).toBe(true);
  });

  it.each(["9429033821733", "9429033591476"])("%s is a checksum-valid GLN", (gln) => {
    expect(isValidGln(gln)).toBe(true);
  });
});
