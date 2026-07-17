import { describe, expect, it, vi } from "vitest";

import {
  PeppolDiscoveryProvider,
  buildSmlHostname,
  type NaptrRecord,
} from "../src/peppol-provider.js";
import {
  PINT_ANZ_BILLING_INVOICE,
  PINT_ANZ_DOCUMENT_SCHEME,
} from "../src/capabilities.js";
import type { ParticipantIdentifier } from "../src/types.js";

const participant: ParticipantIdentifier = {
  source: "participant",
  metaScheme: "iso6523-actorid-upis",
  scheme: "9915",
  value: "test",
  participantValue: "9915:test",
  canonical: "iso6523-actorid-upis::9915:test",
};

const invoiceIdentifier = `${PINT_ANZ_DOCUMENT_SCHEME}::${PINT_ANZ_BILLING_INVOICE}`;
const invoiceUrl = `https://smp.example/participants/services/${encodeURIComponent(invoiceIdentifier)}`;
const unrelatedIdentifier = "busdox-docid-qns::urn:example:unrelated::1";
const unrelatedUrl = `https://smp.example/participants/services/${encodeURIComponent(unrelatedIdentifier)}`;

function naptr(url = "https://smp.example/participants"): NaptrRecord[] {
  return [{ flags: "U", service: "Meta:SMP", regexp: `!^.*$!${url}!`, replacement: "", order: 100, preference: 10 }];
}

function serviceGroup(references = [invoiceUrl, unrelatedUrl]): string {
  return `<?xml version="1.0"?>
    <ServiceGroup xmlns="http://docs.oasis-open.org/bdxr/ns/SMP/2016/05">
      <ParticipantIdentifier scheme="${participant.metaScheme}">${participant.participantValue}</ParticipantIdentifier>
      <ServiceMetadataReferenceCollection>
        ${references.map((href) => `<ServiceMetadataReference href="${href}"/>`).join("")}
      </ServiceMetadataReferenceCollection>
    </ServiceGroup>`;
}

function signedMetadata(body?: string, signature = true): string {
  return `<?xml version="1.0"?>
    <SignedServiceMetadata xmlns="http://docs.oasis-open.org/bdxr/ns/SMP/2016/05" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <ServiceMetadata>${body ?? `
        <ServiceInformation>
          <ParticipantIdentifier scheme="${participant.metaScheme}">${participant.participantValue}</ParticipantIdentifier>
          <DocumentIdentifier scheme="${PINT_ANZ_DOCUMENT_SCHEME}">${PINT_ANZ_BILLING_INVOICE}</DocumentIdentifier>
          <ProcessList><Process>
            <ProcessIdentifier scheme="cenbii-procid-ubl">urn:peppol:bis:billing</ProcessIdentifier>
            <ServiceEndpointList><Endpoint transportProfile="peppol-transport-as4-v2_0">
              <EndpointReference><Address>https://ap.example.net/as4</Address></EndpointReference>
              <ServiceActivationDate>2026-01-01T00:00:00Z</ServiceActivationDate>
            </Endpoint></ServiceEndpointList>
          </Process></ProcessList>
        </ServiceInformation>`}
      </ServiceMetadata>
      ${signature ? "<ds:Signature><ds:SignedInfo/></ds:Signature>" : ""}
    </SignedServiceMetadata>`;
}

function xmlResponse(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers: { "content-type": "application/xml; charset=utf-8", ...headers } });
}

function fetchSequence(...responses: Array<Response | ((input: URL | RequestInfo, init?: RequestInit) => Promise<Response>)>): typeof fetch {
  let index = 0;
  return vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
    const response = responses[index++];
    if (typeof response === "function") return response(input, init);
    if (!response) throw new Error("Unexpected fetch");
    return response;
  }) as unknown as typeof fetch;
}

describe("direct Peppol provider", () => {
  it("uses the published SML 1.3 participant hash vector", () => {
    // SML 1.3.0 section 3.1.1 publishes this identifier and digest. It is an
    // offline protocol fixture only and is never sent to a live network.
    expect(buildSmlHostname({
      metaScheme: "iso6523-actorid-upis",
      participantValue: "0010:5798000000001",
    }, "example.test")).toBe(
      "xukhfqabqziki3ykvr2fhr4snfa3pf5vpq6k4tonv3lmvsy5arvq.iso6523-actorid-upis.example.test",
    );
  });

  it("AC-04: enforces bounded direct discovery", async () => {
    // Peppol test-scheme input, used only with injected offline dependencies.
    expect(buildSmlHostname(participant, "participant.sml.test.tech.peppol.org")).toBe(
      "eh5boavaktmbgzyh2a63dz4qov33fvp5nsdvqklucfraayoodw6a.iso6523-actorid-upis.participant.sml.test.tech.peppol.org",
    );

    const fetcher = fetchSequence(xmlResponse(serviceGroup()), xmlResponse(signedMetadata()));
    const provider = new PeppolDiscoveryProvider({
      resolveNaptr: async () => naptr(),
      fetch: fetcher,
      sleep: async () => undefined,
    });
    const result = await provider.discover(participant);

    expect(result.state).toBe("found");
    expect(result.advertisedDocuments).toEqual([invoiceIdentifier, unrelatedIdentifier]);
    expect(result.advertisedProcesses).toEqual(["cenbii-procid-ubl::urn:peppol:bis:billing"]);
    expect(result.capabilities).toMatchObject([{
      kind: "invoice",
      signatureStatus: "not-verified",
      endpoints: [{ endpointHost: "ap.example.net", transportProfile: "peppol-transport-as4-v2_0" }],
    }]);
    expect(result.warnings).toEqual(["SMP signature present but not cryptographically verified."]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({
      redirect: "manual",
      headers: { "user-agent": "@pint-anz/lookup/0.1.0" },
    }));
  });

  it.each(["ENODATA", "ENOTFOUND"])("maps DNS %s only to not-found", async (code) => {
    const provider = new PeppolDiscoveryProvider({ resolveNaptr: async () => { throw Object.assign(new Error(code), { code }); } });
    await expect(provider.discover(participant)).resolves.toMatchObject({ state: "not-found" });
  });

  it("maps only a ServiceGroup 404 to not-found", async () => {
    const provider = new PeppolDiscoveryProvider({
      resolveNaptr: async () => naptr(),
      fetch: fetchSequence(xmlResponse("", 404)),
    });
    await expect(provider.discover(participant)).resolves.toMatchObject({ state: "not-found" });
  });

  it("retries transient DNS once and maps exhaustion to temporarily-unavailable", async () => {
    const resolver = vi.fn(async () => { throw Object.assign(new Error("again"), { code: "EAI_AGAIN" }); });
    const sleep = vi.fn(async () => undefined);
    const provider = new PeppolDiscoveryProvider({ resolveNaptr: resolver, sleep });
    await expect(provider.discover(participant)).resolves.toMatchObject({ state: "temporarily-unavailable" });
    expect(resolver).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("bounds a stalled DNS resolver and honours an already-aborted signal", async () => {
    const resolver = vi.fn(() => new Promise<readonly NaptrRecord[]>(() => undefined));
    const provider = new PeppolDiscoveryProvider({
      resolveNaptr: resolver,
      timeoutMs: 5,
      sleep: async () => undefined,
    });
    await expect(provider.discover(participant)).resolves.toMatchObject({ state: "temporarily-unavailable" });
    expect(resolver).toHaveBeenCalledTimes(2);

    const controller = new AbortController();
    controller.abort();
    const neverCalled = vi.fn(async () => naptr());
    const aborted = new PeppolDiscoveryProvider({ resolveNaptr: neverCalled });
    await expect(aborted.discover(participant, controller.signal)).resolves.toMatchObject({
      state: "temporarily-unavailable",
    });
    expect(neverCalled).not.toHaveBeenCalled();
  });

  it("retries a transient HTTP response once", async () => {
    const fetcher = fetchSequence(xmlResponse("", 503), xmlResponse(serviceGroup([])));
    const provider = new PeppolDiscoveryProvider({ resolveNaptr: async () => naptr(), fetch: fetcher, sleep: async () => undefined });
    await expect(provider.discover(participant)).resolves.toMatchObject({ state: "found" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each([
    "http://smp.example/",
    "https://user@smp.example/",
    "https://smp.example:8443/",
    "https://127.0.0.1/",
    "https://10.0.0.1/",
    "https://localhost/",
    "https://[::1]/",
    "https://[::ffff:a00:1]/",
    "https://smp.example/?target=x",
  ])("rejects unsafe U-NAPTR URL %s", async (url) => {
    const provider = new PeppolDiscoveryProvider({ resolveNaptr: async () => naptr(url) });
    await expect(provider.discover(participant)).resolves.toMatchObject({ state: "indeterminate" });
  });

  it("rejects HTTP redirects without following them", async () => {
    const fetcher = fetchSequence(new Response(null, { status: 302, headers: { location: "https://other.example/" } }));
    const provider = new PeppolDiscoveryProvider({ resolveNaptr: async () => naptr(), fetch: fetcher });
    await expect(provider.discover(participant)).resolves.toMatchObject({ state: "indeterminate" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects a successful response with a non-XML media type", async () => {
    const provider = new PeppolDiscoveryProvider({
      resolveNaptr: async () => naptr(),
      fetch: fetchSequence(new Response(serviceGroup(), { headers: { "content-type": "text/html" } })),
    });
    await expect(provider.discover(participant)).resolves.toMatchObject({ state: "indeterminate" });
  });

  it("times out and retries a stalled fetch within the configured bound", async () => {
    const stalled = (_input: URL | RequestInfo, init?: RequestInit): Promise<Response> => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    });
    const fetcher = fetchSequence(stalled, stalled);
    const provider = new PeppolDiscoveryProvider({ resolveNaptr: async () => naptr(), fetch: fetcher, timeoutMs: 5, sleep: async () => undefined });
    await expect(provider.discover(participant)).resolves.toMatchObject({ state: "temporarily-unavailable" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects oversized streaming bodies and malformed or entity-bearing XML", async () => {
    for (const body of ["x".repeat(33), "<ServiceGroup>", "<!DOCTYPE x [<!ENTITY y SYSTEM 'file:///etc/passwd'>]><ServiceGroup>&y;</ServiceGroup>"]) {
      const provider = new PeppolDiscoveryProvider({
        resolveNaptr: async () => naptr(),
        fetch: fetchSequence(xmlResponse(body)),
        maxResponseBytes: 32,
      });
      await expect(provider.discover(participant)).resolves.toMatchObject({ state: "indeterminate" });
    }
  });

  it("follows one safe SMP XML redirect and rejects a second", async () => {
    const redirect = signedMetadata(
      '<Redirect href="https://redirect.example/metadata"><CertificateUID>redirect-cert</CertificateUID></Redirect>',
    );
    const oneHop = new PeppolDiscoveryProvider({
      resolveNaptr: async () => naptr(),
      fetch: fetchSequence(xmlResponse(serviceGroup([invoiceUrl])), xmlResponse(redirect), xmlResponse(signedMetadata())),
    });
    await expect(oneHop.discover(participant)).resolves.toMatchObject({ state: "found" });

    const twoHops = new PeppolDiscoveryProvider({
      resolveNaptr: async () => naptr(),
      fetch: fetchSequence(xmlResponse(serviceGroup([invoiceUrl])), xmlResponse(redirect), xmlResponse(redirect)),
    });
    await expect(twoHops.discover(participant)).resolves.toMatchObject({ state: "indeterminate" });
  });

  it("passes the redirect CertificateUID to the destination signature verifier", async () => {
    const redirect = signedMetadata(
      '<Redirect href="https://redirect.example/metadata"><CertificateUID>redirect-cert</CertificateUID></Redirect>',
    );
    const verify = vi.fn(async () => "verified" as const);
    const provider = new PeppolDiscoveryProvider({
      resolveNaptr: async () => naptr(),
      fetch: fetchSequence(
        xmlResponse(serviceGroup([invoiceUrl])),
        xmlResponse(redirect),
        xmlResponse(signedMetadata()),
      ),
      verifier: { verify },
    });

    await expect(provider.discover(participant)).resolves.toMatchObject({ state: "found" });
    expect(verify).toHaveBeenNthCalledWith(1, redirect, invoiceUrl, undefined);
    expect(verify).toHaveBeenNthCalledWith(
      2,
      signedMetadata(),
      "https://redirect.example/metadata",
      "redirect-cert",
    );
  });

  it("rejects an SMP XML redirect without its required CertificateUID element", async () => {
    const provider = new PeppolDiscoveryProvider({
      resolveNaptr: async () => naptr(),
      fetch: fetchSequence(
        xmlResponse(serviceGroup([invoiceUrl])),
        xmlResponse(signedMetadata('<Redirect href="https://redirect.example/metadata"/>')),
      ),
    });
    await expect(provider.discover(participant)).resolves.toMatchObject({ state: "indeterminate" });
  });

  it("requires a present and valid signature when a verifier is supplied", async () => {
    const absent = new PeppolDiscoveryProvider({
      resolveNaptr: async () => naptr(),
      fetch: fetchSequence(xmlResponse(serviceGroup([invoiceUrl])), xmlResponse(signedMetadata(undefined, false))),
    });
    await expect(absent.discover(participant)).resolves.toMatchObject({ state: "indeterminate" });

    const invalid = new PeppolDiscoveryProvider({
      resolveNaptr: async () => naptr(),
      fetch: fetchSequence(xmlResponse(serviceGroup([invoiceUrl])), xmlResponse(signedMetadata())),
      verifier: { verify: async () => "invalid" },
    });
    await expect(invalid.discover(participant)).resolves.toMatchObject({ state: "indeterminate" });
  });

  it("keeps valid metadata with a non-billing process as capability-absent", async () => {
    const metadata = signedMetadata(`
      <ServiceInformation>
        <ParticipantIdentifier scheme="${participant.metaScheme}">${participant.participantValue}</ParticipantIdentifier>
        <DocumentIdentifier scheme="${PINT_ANZ_DOCUMENT_SCHEME}">${PINT_ANZ_BILLING_INVOICE}</DocumentIdentifier>
        <ProcessList><Process><ProcessIdentifier scheme="example-process">urn:example:other</ProcessIdentifier></Process></ProcessList>
      </ServiceInformation>`);
    const provider = new PeppolDiscoveryProvider({
      resolveNaptr: async () => naptr(),
      fetch: fetchSequence(xmlResponse(serviceGroup([invoiceUrl])), xmlResponse(metadata)),
    });
    await expect(provider.discover(participant)).resolves.toMatchObject({
      state: "found",
      capabilities: [],
      advertisedProcesses: ["example-process::urn:example:other"],
    });
  });

  it("rejects participant and document identifiers that do not match the request", async () => {
    const wrongGroup = serviceGroup().replace(participant.participantValue, "9915:other");
    const wrongParticipantMetadata = signedMetadata().replace(participant.participantValue, "9915:other");
    const wrongDocumentMetadata = signedMetadata().replace(PINT_ANZ_BILLING_INVOICE, "urn:example:other");

    for (const responses of [
      [xmlResponse(wrongGroup)],
      [xmlResponse(serviceGroup([invoiceUrl])), xmlResponse(wrongParticipantMetadata)],
      [xmlResponse(serviceGroup([invoiceUrl])), xmlResponse(wrongDocumentMetadata)],
    ]) {
      const provider = new PeppolDiscoveryProvider({
        resolveNaptr: async () => naptr(),
        fetch: fetchSequence(...responses),
      });
      await expect(provider.discover(participant)).resolves.toMatchObject({ state: "indeterminate" });
    }
  });

  it("bounds ServiceGroup reference count and validates XML reference URLs", async () => {
    for (const references of [[invoiceUrl, unrelatedUrl], ["http://smp.example/unsafe"]]) {
      const provider = new PeppolDiscoveryProvider({
        resolveNaptr: async () => naptr(),
        fetch: fetchSequence(xmlResponse(serviceGroup(references))),
        maxReferences: 1,
      });
      await expect(provider.discover(participant)).resolves.toMatchObject({ state: "indeterminate" });
    }
  });
});
