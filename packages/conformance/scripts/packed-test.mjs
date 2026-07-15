/**
 * Packs @pint-anz/fixtures and verifies the corpus works using ONLY the files
 * shipped in the tarball (TODO.md section 6), and that no official artefact
 * leaks into the published package.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const fixturesDir = fileURLToPath(new URL("../../fixtures", import.meta.url));
const workDir = mkdtempSync(join(tmpdir(), "pint-anz-packed-"));

try {
  const tarball = execFileSync("npm", ["pack", "--pack-destination", workDir], {
    cwd: fixturesDir,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .pop();

  // Guard: no official artefacts, schematron, or XSD content in the tarball.
  const contents = execFileSync("tar", ["-tzf", join(workDir, tarball)], { encoding: "utf8" });
  const leaked = contents
    .split("\n")
    .filter((entry) => /\.(sch|xslt|sef\.json|xsd|gc|zip)$/i.test(entry) || /artefacts\//.test(entry));
  if (leaked.length > 0) {
    throw new Error(`Official/validation artefacts leaked into the tarball:\n${leaked.join("\n")}`);
  }

  execFileSync("tar", ["-xzf", join(workDir, tarball)], { cwd: workDir });
  const packageDir = join(workDir, "package");

  // Exercise the package exactly as a consumer would, from the tarball alone.
  const { manifest, fixtureUrl } = await import(pathToFileURL(join(packageDir, "index.js")));
  if (manifest.fixtures.length === 0) throw new Error("empty manifest in packed package");
  for (const fixture of manifest.fixtures) {
    const contentsBuffer = readFileSync(fixtureUrl(fixture.id));
    if (fixture.expectation !== "rejected" && contentsBuffer.length === 0) {
      throw new Error(`${fixture.id}: empty file in packed package`);
    }
  }
  console.log(
    `Packed-package test passed: ${manifest.fixtures.length} fixtures readable from ${tarball}, no artefact leakage.`,
  );
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
