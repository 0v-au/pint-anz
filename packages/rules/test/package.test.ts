import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const distIndexPath = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

describe("published package boundary", () => {
  it("exports the built API without a runtime conformance dependency", async () => {
    const runtimeSource = readFileSync(distIndexPath, "utf8");
    expect(runtimeSource).not.toContain("conformance");
    const exported = await import("../dist/index.js");
    expect(exported.rules).toHaveLength(245);
    expect(exported.getRule("ibr-004")?.official.id).toBe("ibr-004");
  });

  it("packs only the public API, generated snapshot, and package documentation", () => {
    const output = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
      cwd: packageRoot,
      encoding: "utf8",
    });
    const packed = JSON.parse(output) as Array<{ files: Array<{ path: string }> }>;
    const files = packed[0].files.map((file) => file.path);

    expect(files).toContain("dist/index.js");
    expect(files).toContain("dist/rules.snapshot.json");
    expect(files).toContain("README.md");
    expect(files.some((path) => path.startsWith("src/") || path.startsWith("content/") || path.startsWith("test/"))).toBe(false);
  });

  it("verifies every pinned validator input before interpretation tests and release packing", () => {
    expect(packageJson.scripts["verify:validator"]).toContain("../conformance/scripts/verify-artefacts.mjs");
    expect(packageJson.scripts.test).toMatch(/^pnpm verify:validator &&/);
    expect(packageJson.scripts.prepack).toContain("pnpm test");
    expect(packageJson.scripts.prepublishOnly).toContain("pnpm test");
  });
});
