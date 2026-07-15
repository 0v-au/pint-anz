/**
 * Unit tests for the byte-level preflight policy checks and root detection,
 * exercised directly against ../src/validate.js with inline Buffers so they
 * run without needing the fetched UBL XSD / Schematron artefacts.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { detectRoot, MAX_DOCUMENT_BYTES, preflight, validateDocument } from "../src/validate.js";

const VALID_INVOICE = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>preflight-happy-path</cbc:ID>
</Invoice>
`;

describe("preflight()", () => {
  it("rejects an empty buffer", () => {
    const reasons = preflight(Buffer.alloc(0));
    expect(reasons).toEqual(["empty: document contains no bytes"]);
  });

  it("detects a DOCTYPE declaration case-insensitively", () => {
    const lower = Buffer.from(
      '<?xml version="1.0"?><!doctype Invoice [<!ENTITY xxe SYSTEM "file:///etc/hostname">]><Invoice/>',
    );
    const mixed = Buffer.from(
      '<?xml version="1.0"?><!DocType Invoice [<!ENTITY xxe SYSTEM "file:///etc/hostname">]><Invoice/>',
    );
    for (const bytes of [lower, mixed]) {
      const reasons = preflight(bytes);
      expect(reasons.some((r) => r.startsWith("doctype:"))).toBe(true);
    }
  });

  it("rejects a buffer larger than MAX_DOCUMENT_BYTES", () => {
    const padding = "a".repeat(MAX_DOCUMENT_BYTES + 1);
    const bytes = Buffer.from(
      `<?xml version="1.0"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"><!--${padding}--></Invoice>`,
    );
    expect(bytes.length).toBeGreaterThan(MAX_DOCUMENT_BYTES);
    const reasons = preflight(bytes);
    expect(reasons.some((r) => r.startsWith("oversized:"))).toBe(true);
  });

  it("rejects a declared encoding other than UTF-8", () => {
    const bytes = Buffer.from(
      '<?xml version="1.0" encoding="UTF-16"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"/>',
    );
    const reasons = preflight(bytes);
    expect(reasons).toContain('encoding: declared encoding UTF-16 is not UTF-8');
  });

  it("accepts a declared UTF-8 encoding (case-insensitive match)", () => {
    const bytes = Buffer.from(
      '<?xml version="1.0" encoding="utf-8"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"/>',
    );
    const reasons = preflight(bytes);
    expect(reasons.some((r) => r.startsWith("encoding:"))).toBe(false);
  });

  it("rejects a root with the wrong namespace", () => {
    const bytes = Buffer.from(
      '<?xml version="1.0"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Order-2"/>',
    );
    const reasons = preflight(bytes);
    expect(reasons.some((r) => r.startsWith("wrong-namespace:"))).toBe(true);
  });

  it("rejects an unsupported root element", () => {
    const bytes = Buffer.from(
      '<?xml version="1.0"?><Order xmlns="urn:oasis:names:specification:ubl:schema:xsd:Order-2"/>',
    );
    const reasons = preflight(bytes);
    expect(reasons.some((r) => r.startsWith("unsupported-document:"))).toBe(true);
  });

  it("accepts a well-formed, in-policy Invoice (happy path)", () => {
    const reasons = preflight(Buffer.from(VALID_INVOICE));
    expect(reasons).toEqual([]);
  });

  it("detects a DOCTYPE placed beyond the first 4 KiB of prolog padding", () => {
    // Regression: the scan must cover the whole document, not a fixed head.
    const padding = `<!-- ${"x".repeat(5 * 1024)} -->\n`;
    const bytes = Buffer.from(
      `<?xml version="1.0"?>\n${padding}<!DOCTYPE Invoice [<!ENTITY xxe SYSTEM "file:///etc/hostname">]>\n<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">&xxe;</Invoice>`,
    );
    const reasons = preflight(bytes);
    expect(reasons.some((r) => r.startsWith("doctype:"))).toBe(true);
  });

  it("rejects an unsupported root even when a comment contains a fake Invoice root", () => {
    // Regression: markup inside comments must not drive root dispatch.
    const bytes = Buffer.from(
      '<?xml version="1.0"?>\n<!-- <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"/> -->\n<Order xmlns="urn:oasis:names:specification:ubl:schema:xsd:Order-2"><ID>1</ID></Order>',
    );
    const reasons = preflight(bytes);
    expect(reasons.some((r) => r.startsWith("unsupported-document: root element Order"))).toBe(true);
  });
});

describe("detectRoot()", () => {
  it("returns null when no element is found", () => {
    expect(detectRoot(Buffer.from('<?xml version="1.0"?>'))).toBeNull();
  });

  it("reads the default xmlns for an unprefixed root", () => {
    const root = detectRoot(
      Buffer.from('<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"><cbc:ID/></Invoice>'),
    );
    expect(root).toEqual({
      localName: "Invoice",
      namespace: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    });
  });

  it("reads a prefixed xmlns declaration on the root", () => {
    const root = detectRoot(
      Buffer.from('<ubl:Invoice xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"/>'),
    );
    expect(root).toEqual({
      localName: "Invoice",
      namespace: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    });
  });

  it("skips comments and processing instructions before the root", () => {
    const root = detectRoot(
      Buffer.from(
        '<?xml version="1.0"?>\n<!-- <CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"/> -->\n<?pi data?>\n<Order xmlns="urn:oasis:names:specification:ubl:schema:xsd:Order-2"/>',
      ),
    );
    expect(root).toEqual({
      localName: "Order",
      namespace: "urn:oasis:names:specification:ubl:schema:xsd:Order-2",
    });
  });

  it("returns null for an unterminated comment or bare text before the root", () => {
    expect(detectRoot(Buffer.from("<!-- unterminated <Invoice>"))).toBeNull();
    expect(detectRoot(Buffer.from("hello <Invoice/>"))).toBeNull();
  });
});

describe("validateDocument() never resolves external entities", () => {
  it("rejects the DOCTYPE fixture at preflight without the referenced file content appearing anywhere", async () => {
    const fixturePath = fileURLToPath(
      new URL("../../fixtures/malformed/invoice-doctype-entity.xml", import.meta.url),
    );
    const result = await validateDocument(fixturePath);

    expect(result.stage).toBe("rejected");
    expect(result.rejectionReasons.some((r) => r.startsWith("doctype:"))).toBe(true);
    expect(result.fired).toEqual([]);
    expect(result.firedIds).toEqual([]);

    // The fixture references file:///etc/hostname via an external entity. Prove
    // the preflight rejection never parses far enough to resolve it: whatever
    // this machine's hostname is (where /etc/hostname exists), it must not leak
    // into the result payload.
    const serialized = JSON.stringify(result);
    if (existsSync("/etc/hostname")) {
      const hostname = readFileSync("/etc/hostname", "utf8").trim();
      if (hostname.length > 0) {
        expect(serialized).not.toContain(hostname);
      }
    }
    expect(serialized).not.toContain("xxe");
  });
});
