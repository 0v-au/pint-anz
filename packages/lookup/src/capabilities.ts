import type { Capability, CapabilityRequest } from "./types.js";

export const PINT_ANZ_DOCUMENT_SCHEME = "peppol-doctype-wildcard" as const;
export const PINT_ANZ_BILLING_PROCESS_SCHEME = "cenbii-procid-ubl" as const;
export const PINT_ANZ_BILLING_PROCESS = "urn:peppol:bis:billing" as const;

export const PINT_ANZ_BILLING_INVOICE =
  "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2::Invoice##urn:peppol:pint:billing-1@aunz-1::2.1" as const;
export const PINT_ANZ_BILLING_CREDIT_NOTE =
  "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2::CreditNote##urn:peppol:pint:billing-1@aunz-1::2.1" as const;

type CapabilityMetadata = Omit<Capability, "kind">;

interface DocumentIdentifierParts {
  readonly syntax: string;
  readonly customization: string;
  readonly version: string;
}

const CATALOGUE: ReadonlyArray<{
  readonly kind: CapabilityRequest;
  readonly documentValue: string;
}> = [
  { kind: "invoice", documentValue: PINT_ANZ_BILLING_INVOICE },
  { kind: "credit-note", documentValue: PINT_ANZ_BILLING_CREDIT_NOTE },
];

function parseDocumentIdentifier(value: string): DocumentIdentifierParts | undefined {
  const customizationSeparator = value.indexOf("##");
  const versionSeparator = value.lastIndexOf("::");

  if (
    customizationSeparator <= 0 ||
    versionSeparator <= customizationSeparator + 2 ||
    versionSeparator + 2 === value.length
  ) {
    return undefined;
  }

  return {
    syntax: value.slice(0, customizationSeparator),
    customization: value.slice(customizationSeparator + 2, versionSeparator),
    version: value.slice(versionSeparator + 2),
  };
}

function customizationMatches(advertised: string, requested: string): boolean {
  if (!advertised.includes("*")) {
    return advertised === requested;
  }

  if (!advertised.endsWith("*") || advertised.indexOf("*") !== advertised.length - 1) {
    return false;
  }

  const advertisedPart = advertised.slice(0, -1);
  if (advertisedPart.length === 0 || advertisedPart.endsWith("@")) {
    return false;
  }

  return requested === advertisedPart || requested.startsWith(`${advertisedPart}@`);
}

function matchesDocument(advertisedValue: string, requestedValue: string): boolean {
  const advertised = parseDocumentIdentifier(advertisedValue);
  const requested = parseDocumentIdentifier(requestedValue);

  return Boolean(
    advertised &&
      requested &&
      advertised.syntax === requested.syntax &&
      advertised.version === requested.version &&
      customizationMatches(advertised.customization, requested.customization),
  );
}

/** Map parsed SMP service metadata to capabilities in the pinned PINT A-NZ catalogue. */
export function mapPintAnzBillingCapabilities(
  advertisements: readonly CapabilityMetadata[],
): Capability[] {
  const capabilities: Capability[] = [];

  for (const advertisement of advertisements) {
    if (
      advertisement.documentScheme !== PINT_ANZ_DOCUMENT_SCHEME ||
      advertisement.processScheme !== PINT_ANZ_BILLING_PROCESS_SCHEME ||
      advertisement.processValue !== PINT_ANZ_BILLING_PROCESS
    ) {
      continue;
    }

    const catalogueEntry = CATALOGUE.find(({ documentValue }) =>
      matchesDocument(advertisement.documentValue, documentValue),
    );

    if (catalogueEntry) {
      capabilities.push({ ...advertisement, kind: catalogueEntry.kind });
    }
  }

  return capabilities;
}
