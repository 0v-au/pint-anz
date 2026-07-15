import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Repo-root artefact cache. Gitignored; populated by `pnpm fetch`. */
export const artefactsDir = fileURLToPath(new URL("../../../artefacts/", import.meta.url));
export const lockPath = fileURLToPath(new URL("../artefacts.lock.json", import.meta.url));

export const paths = {
  invoiceXsd: `${artefactsDir}ubl-2.1/xsd/maindoc/UBL-Invoice-2.1.xsd`,
  creditNoteXsd: `${artefactsDir}ubl-2.1/xsd/maindoc/UBL-CreditNote-2.1.xsd`,
  pintSch: `${artefactsDir}resources/trn-invoice/schematron/PINT-UBL-validation-preprocessed.sch`,
  alignedSch: `${artefactsDir}resources/trn-invoice/schematron/PINT-jurisdiction-aligned-rules.sch`,
  pintXslt: `${artefactsDir}resources/trn-invoice/schematron/PINT-UBL-validation-preprocessed.xslt`,
  alignedXslt: `${artefactsDir}resources/trn-invoice/schematron/PINT-jurisdiction-aligned-rules.xslt`,
  pintSef: `${artefactsDir}sef/pint.sef.json`,
  alignedSef: `${artefactsDir}sef/aligned.sef.json`,
};

export function readLock() {
  return JSON.parse(readFileSync(lockPath, "utf8"));
}

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function sha256File(path) {
  return sha256(readFileSync(path));
}

/** Throws when any pinned artefact on disk differs from the lock file. */
export function verifyPinnedFiles() {
  const lock = readLock();
  const drifted = [];
  for (const [relative, expected] of Object.entries(lock.files)) {
    let actual;
    try {
      actual = sha256File(artefactsDir + relative);
    } catch {
      drifted.push(`${relative}: missing (run \`pnpm --filter @pint-anz/conformance artefacts\`)`);
      continue;
    }
    if (actual !== expected) {
      drifted.push(`${relative}: expected ${expected}, got ${actual}`);
    }
  }
  if (drifted.length > 0) {
    throw new Error(`Pinned artefact checksum drift:\n${drifted.join("\n")}`);
  }
  return lock;
}
