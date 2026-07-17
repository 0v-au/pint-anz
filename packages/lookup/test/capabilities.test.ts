import { describe, expect, it } from "vitest";

import {
  PINT_ANZ_BILLING_CREDIT_NOTE,
  PINT_ANZ_BILLING_INVOICE,
  PINT_ANZ_BILLING_PROCESS,
  mapPintAnzBillingCapabilities,
} from "../src/capabilities.js";
import type { Capability, EndpointMetadata } from "../src/types.js";

const endpoint: EndpointMetadata = {
  endpointHost: "ap.example.net",
  transportProfile: "peppol-transport-as4-v2_0",
  activationDate: null,
  expirationDate: null,
};

function advertisement(
  documentValue: string,
  overrides: Partial<Omit<Capability, "kind" | "documentValue">> = {},
): Omit<Capability, "kind"> {
  return {
    documentScheme: "peppol-doctype-wildcard",
    documentValue,
    processScheme: "cenbii-procid-ubl",
    processValue: PINT_ANZ_BILLING_PROCESS,
    endpoints: [endpoint],
    signatureStatus: "not-verified",
    ...overrides,
  };
}

describe("capability catalogue", () => {
  it("AC-02: maps PINT A-NZ billing capabilities", () => {
    const invoiceWildcard = PINT_ANZ_BILLING_INVOICE.replace("@aunz-1", "*");
    const creditNoteWildcard = PINT_ANZ_BILLING_CREDIT_NOTE.replace(
      "@aunz-1",
      "@aunz-1*",
    );

    const mapped = mapPintAnzBillingCapabilities([
      advertisement(PINT_ANZ_BILLING_INVOICE),
      advertisement(PINT_ANZ_BILLING_CREDIT_NOTE),
      advertisement(invoiceWildcard),
      advertisement(creditNoteWildcard),
    ]);

    expect(mapped.map(({ kind, documentValue }) => ({ kind, documentValue }))).toEqual([
      { kind: "invoice", documentValue: PINT_ANZ_BILLING_INVOICE },
      { kind: "credit-note", documentValue: PINT_ANZ_BILLING_CREDIT_NOTE },
      { kind: "invoice", documentValue: invoiceWildcard },
      { kind: "credit-note", documentValue: creditNoteWildcard },
    ]);
    expect(mapped[0]).toMatchObject({
      endpoints: [endpoint],
      signatureStatus: "not-verified",
    });
  });

  it("rejects unrelated, self-billing, wrong-process, and malformed wildcard records", () => {
    const singaporeInvoice = PINT_ANZ_BILLING_INVOICE.replace("@aunz-1", "@sg-1");
    const selfBillingInvoice = PINT_ANZ_BILLING_INVOICE.replace(
      ":billing-1@aunz-1",
      ":selfbilling-1@aunz-1",
    );

    const mapped = mapPintAnzBillingCapabilities([
      advertisement(singaporeInvoice),
      advertisement(selfBillingInvoice),
      advertisement(PINT_ANZ_BILLING_INVOICE, {
        processValue: "urn:peppol:bis:selfbilling",
      }),
      advertisement(PINT_ANZ_BILLING_INVOICE, {
        processScheme: "other-process-scheme",
      }),
      advertisement(PINT_ANZ_BILLING_INVOICE, {
        documentScheme: "busdox-docid-qns",
      }),
      advertisement(PINT_ANZ_BILLING_INVOICE.replace("@aunz-1", "@aunz-1*@extension")),
      advertisement(PINT_ANZ_BILLING_INVOICE.replace("@aunz-1", "@aunz-10*")),
    ]);

    expect(mapped).toEqual([]);
  });
});
