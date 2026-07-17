import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { resolveNaptr } from "node:dns/promises";

import {
  mapPintAnzBillingCapabilities,
  PINT_ANZ_BILLING_PROCESS,
  PINT_ANZ_BILLING_PROCESS_SCHEME,
} from "./capabilities.js";
import type {
  Capability,
  DiscoveryObservation,
  DiscoveryProvider,
  EndpointMetadata,
  MetadataVerifier,
  ParticipantIdentifier,
  SignatureStatus,
} from "./types.js";
import { LOOKUP_VERSION } from "./types.js";
import {
  isXmlElement,
  parseSafeXml,
  UnsafeXmlError,
  xmlAttribute,
  xmlChildren,
  xmlText,
  type XmlElement,
} from "./xml.js";

export const DEFAULT_SML_ZONE = "edelivery.tech.ec.europa.eu" as const;

/** DNS NAPTR fields consumed by direct Peppol discovery. */
export interface NaptrRecord {
  /** NAPTR flags; Peppol U-NAPTR requires `U`. @example "U" */
  readonly flags: string;
  /** Service selector; Peppol SMP records use `Meta:SMP`. @example "Meta:SMP" */
  readonly service: string;
  /** U-NAPTR substitution expression containing the SMP URL. @example "!^.*$!https://smp.example/!" */
  readonly regexp: string;
  /** Replacement field, normally empty for U-NAPTR. @example "" */
  readonly replacement: string;
  /** NAPTR order. @example 100 */
  readonly order: number;
  /** Preference among records with equal order. @example 10 */
  readonly preference: number;
}

/** Dependencies and resource limits for direct Peppol discovery. */
export interface PeppolProviderOptions {
  /** Production SML DNS zone. @example "edelivery.tech.ec.europa.eu" */
  readonly smlZone?: string;
  /** Injectable NAPTR resolver for deterministic tests. @example "custom resolver" */
  readonly resolveNaptr?: (hostname: string) => Promise<readonly NaptrRecord[]>;
  /** Injectable Fetch implementation. @example "globalThis.fetch" */
  readonly fetch?: typeof globalThis.fetch;
  /** Injectable retry delay implementation. @example "deterministic sleep" */
  readonly sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
  /** Optional caller-supplied Peppol PKI signature verifier. @example "custom verifier" */
  readonly verifier?: MetadataVerifier;
  /** Per-request timeout in milliseconds. @example 5000 */
  readonly timeoutMs?: number;
  /** Retry count after the initial attempt. @example 1 */
  readonly maxRetries?: number;
  /** Delay between attempts in milliseconds. @example 100 */
  readonly retryDelayMs?: number;
  /** Maximum bytes accepted for one XML response. @example 1048576 */
  readonly maxResponseBytes?: number;
  /** Maximum ServiceMetadata references accepted from one ServiceGroup. @example 100 */
  readonly maxReferences?: number;
}

interface ResolvedOptions {
  readonly smlZone: string;
  readonly resolveNaptr: (hostname: string) => Promise<readonly NaptrRecord[]>;
  readonly fetch: typeof globalThis.fetch;
  readonly sleep: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
  readonly verifier?: MetadataVerifier;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly retryDelayMs: number;
  readonly maxResponseBytes: number;
  readonly maxReferences: number;
}

interface HttpXml {
  readonly kind: "ok" | "not-found";
  readonly xml?: string;
}

interface DocumentReference {
  readonly url: URL;
  readonly identifier: string;
  readonly scheme: string;
  readonly value: string;
  readonly relevant: boolean;
}

class DiscoveryFailure extends Error {
  constructor(readonly state: "not-found" | "temporarily-unavailable" | "indeterminate") {
    super(state);
  }
}

const DEFAULTS = {
  timeoutMs: 5_000,
  maxRetries: 1,
  retryDelayMs: 100,
  maxResponseBytes: 1_048_576,
  maxReferences: 100,
} as const;

const TRANSIENT_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);
const NOT_FOUND_DNS = new Set(["ENODATA", "ENOTFOUND"]);
const TRANSIENT_DNS = new Set(["EAI_AGAIN", "ETIMEOUT", "ESERVFAIL", "EREFUSED", "ECONNREFUSED"]);

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Build the SML v1.3 DNS name for a Participant Identifier. */
export function buildSmlHostname(
  participant: Pick<ParticipantIdentifier, "metaScheme" | "participantValue">,
  smlZone: string = DEFAULT_SML_ZONE,
): string {
  const digest = createHash("sha256").update(participant.participantValue.toLowerCase(), "utf8").digest();
  return `${base32Unpadded(digest).toLowerCase()}.${participant.metaScheme}.${normaliseZone(smlZone)}`;
}

/** Direct, read-only Peppol SML/SMP Discovery Provider. */
export class PeppolDiscoveryProvider implements DiscoveryProvider {
  readonly name = "peppol-sml-smp";
  private readonly options: ResolvedOptions;

  constructor(options: PeppolProviderOptions = {}) {
    this.options = resolveOptions(options);
  }

  async discover(
    participant: ParticipantIdentifier,
    signal?: AbortSignal,
  ): Promise<DiscoveryObservation> {
    const empty = {
      provider: this.name,
      source: this.options.smlZone,
      capabilities: [] as Capability[],
      advertisedDocuments: [] as string[],
      advertisedProcesses: [] as string[],
      warnings: [] as string[],
    };

    try {
      const hostname = buildSmlHostname(participant, this.options.smlZone);
      const records = await retry(
        () => resolveNaptrWithTimeout(this.options.resolveNaptr, hostname, this.options.timeoutMs, signal),
        this.options,
        signal,
        classifyDnsError,
      );
      const smpBase = selectSmpUrl(records);
      const serviceGroupUrl = appendPath(smpBase, participant.canonical);
      const serviceGroup = await this.getXml(serviceGroupUrl, signal, true);
      if (serviceGroup.kind === "not-found") return { state: "not-found", ...empty };

      const references = parseServiceGroup(serviceGroup.xml!, participant, this.options.maxReferences);
      const advertisedDocuments = references.map(({ identifier }) => identifier);
      const capabilities: Capability[] = [];
      const advertisedProcesses: string[] = [];
      const warnings: string[] = [];

      for (const reference of references) {
        if (!reference.relevant) continue;
        const parsed = await this.readServiceMetadata(reference, participant, signal, 0, warnings);
        advertisedProcesses.push(...parsed.processes);
        capabilities.push(...parsed.capabilities);
      }

      return {
        state: "found",
        ...empty,
        capabilities,
        advertisedDocuments,
        advertisedProcesses,
        warnings: [...new Set(warnings)],
      };
    } catch (error) {
      const state = error instanceof DiscoveryFailure ? error.state : "indeterminate";
      return { state, ...empty };
    }
  }

  private async readServiceMetadata(
    reference: DocumentReference,
    participant: ParticipantIdentifier,
    signal: AbortSignal | undefined,
    redirectDepth: number,
    warnings: string[],
    expectedCertificateUid?: string,
  ): Promise<{ readonly capabilities: Capability[]; readonly processes: string[] }> {
    const response = await this.getXml(reference.url, signal, false);
    if (response.kind !== "ok") throw new DiscoveryFailure("indeterminate");
    const document = parseSignedServiceMetadata(response.xml!, participant, reference);

    const signatureStatus = await this.signatureStatus(
      response.xml!,
      reference.url,
      document.signaturePresent,
      warnings,
      expectedCertificateUid,
    );
    if (signatureStatus === "not-present" || signatureStatus === "invalid") {
      throw new DiscoveryFailure("indeterminate");
    }

    if (document.redirectUrl) {
      if (redirectDepth >= 1) throw new DiscoveryFailure("indeterminate");
      return this.readServiceMetadata(
        { ...reference, url: document.redirectUrl },
        participant,
        signal,
        redirectDepth + 1,
        warnings,
        document.redirectCertificateUid,
      );
    }

    if (!document.advertisement) return { capabilities: [], processes: document.processes };
    const advertisement = { ...document.advertisement, signatureStatus };
    return {
      capabilities: mapPintAnzBillingCapabilities([advertisement]),
      processes: document.processes,
    };
  }

  private async signatureStatus(
    xml: string,
    url: URL,
    present: boolean,
    warnings: string[],
    expectedCertificateUid?: string,
  ): Promise<SignatureStatus> {
    if (!present) return "not-present";
    if (!this.options.verifier) {
      warnings.push("SMP signature present but not cryptographically verified.");
      if (expectedCertificateUid !== undefined) {
        warnings.push("SMP redirect destination certificate UID was not verified.");
      }
      return "not-verified";
    }
    try {
      return await this.options.verifier.verify(xml, url.href, expectedCertificateUid);
    } catch {
      return "invalid";
    }
  }

  private async getXml(url: URL, signal: AbortSignal | undefined, notFoundAllowed: boolean): Promise<HttpXml> {
    const response = await retry(
      async () => {
        const fetched = await fetchWithTimeout(this.options.fetch, url, this.options.timeoutMs, signal);
        if (TRANSIENT_HTTP.has(fetched.status)) {
          await cancelBody(fetched);
          throw new DiscoveryFailure("temporarily-unavailable");
        }
        return fetched;
      },
      this.options,
      signal,
      classifyHttpError,
    );

    if (response.status === 404 && notFoundAllowed) {
      await cancelBody(response);
      return { kind: "not-found" };
    }
    if (response.status >= 300 && response.status < 400) {
      await cancelBody(response);
      throw new DiscoveryFailure("indeterminate");
    }
    if (!response.ok) {
      await cancelBody(response);
      throw new DiscoveryFailure("indeterminate");
    }
    if (!isXmlContentType(response.headers.get("content-type"))) {
      await cancelBody(response);
      throw new DiscoveryFailure("indeterminate");
    }

    const xml = await readBoundedBody(response, this.options.maxResponseBytes);
    return { kind: "ok", xml };
  }
}

/** Create the production direct Peppol Discovery Provider. */
export function createPeppolDiscoveryProvider(options: PeppolProviderOptions = {}): DiscoveryProvider {
  return new PeppolDiscoveryProvider(options);
}

function resolveOptions(options: PeppolProviderOptions): ResolvedOptions {
  const positive = (value: number | undefined, fallback: number): number =>
    Number.isSafeInteger(value) && value! > 0 ? value! : fallback;
  const nonnegative = (value: number | undefined, fallback: number): number =>
    Number.isSafeInteger(value) && value! >= 0 ? value! : fallback;

  return {
    smlZone: normaliseZone(options.smlZone ?? DEFAULT_SML_ZONE),
    resolveNaptr: options.resolveNaptr ?? (resolveNaptr as (hostname: string) => Promise<NaptrRecord[]>),
    fetch: options.fetch ?? globalThis.fetch,
    sleep: options.sleep ?? defaultSleep,
    verifier: options.verifier,
    timeoutMs: positive(options.timeoutMs, DEFAULTS.timeoutMs),
    maxRetries: nonnegative(options.maxRetries, DEFAULTS.maxRetries),
    retryDelayMs: nonnegative(options.retryDelayMs, DEFAULTS.retryDelayMs),
    maxResponseBytes: positive(options.maxResponseBytes, DEFAULTS.maxResponseBytes),
    maxReferences: positive(options.maxReferences, DEFAULTS.maxReferences),
  };
}

function normaliseZone(zone: string = DEFAULT_SML_ZONE): string {
  const value = zone.trim().toLowerCase().replace(/\.$/, "");
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value)) {
    throw new Error("Invalid SML zone.");
  }
  return value;
}

function base32Unpadded(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += base32Alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += base32Alphabet[(value << (5 - bits)) & 31];
  return output;
}

function selectSmpUrl(records: readonly NaptrRecord[]): URL {
  const selected = records
    .filter(({ flags, service }) => flags.toUpperCase() === "U" && service.toLowerCase() === "meta:smp")
    .sort((left, right) => left.order - right.order || left.preference - right.preference)[0];
  if (!selected) throw new DiscoveryFailure("indeterminate");
  if (selected.replacement && selected.replacement !== ".") throw new DiscoveryFailure("indeterminate");

  const replacement = naptrReplacement(selected.regexp);
  return safeHttpsUrl(replacement);
}

function naptrReplacement(regexp: string): string {
  if (regexp.length < 4) throw new DiscoveryFailure("indeterminate");
  const delimiter = regexp[0]!;
  const second = regexp.indexOf(delimiter, 1);
  const third = regexp.indexOf(delimiter, second + 1);
  if (second < 1 || third < 0 || third !== regexp.length - 1) {
    throw new DiscoveryFailure("indeterminate");
  }
  const pattern = regexp.slice(1, second);
  if (pattern !== ".*" && pattern !== "^.*$") throw new DiscoveryFailure("indeterminate");
  return regexp.slice(second + 1, third);
}

function safeHttpsUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new DiscoveryFailure("indeterminate");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.port && url.port !== "443") ||
    !url.hostname
  ) {
    throw new DiscoveryFailure("indeterminate");
  }
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    isUnsafeIpLiteral(hostname)
  ) {
    throw new DiscoveryFailure("indeterminate");
  }
  return url;
}

function isUnsafeIpLiteral(hostname: string): boolean {
  const unwrapped = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  const version = isIP(unwrapped);
  if (version === 4) {
    const [a, b] = unwrapped.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) || (a === 172 && b! >= 16 && b! <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b! >= 64 && b! <= 127) || a! >= 224
    );
  }
  if (version === 6) {
    const lower = unwrapped.toLowerCase();
    return lower === "::" || lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") ||
      /^fe[89a-f]/.test(lower) || lower.startsWith("ff") || unsafeMappedIpv4(lower);
  }
  return false;
}

function unsafeMappedIpv4(address: string): boolean {
  if (!address.startsWith("::ffff:")) return false;
  const tail = address.slice("::ffff:".length);
  if (isIP(tail) === 4) return isUnsafeIpLiteral(tail);
  const groups = tail.split(":");
  if (groups.length !== 2 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return true;
  const high = Number.parseInt(groups[0]!, 16);
  const low = Number.parseInt(groups[1]!, 16);
  return isUnsafeIpLiteral(`${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`);
}

function appendPath(base: URL, segment: string): URL {
  const value = safeHttpsUrl(base.href);
  value.pathname = `${value.pathname.replace(/\/$/, "")}/${encodeURIComponent(segment)}`;
  return value;
}

function parseServiceGroup(
  xml: string,
  participant: ParticipantIdentifier,
  maxReferences: number,
): DocumentReference[] {
  let root: XmlElement;
  try {
    root = parseSafeXml(xml);
  } catch (error) {
    if (error instanceof UnsafeXmlError) throw new DiscoveryFailure("indeterminate");
    throw error;
  }
  const group = root.ServiceGroup;
  if (!isXmlElement(group)) throw new DiscoveryFailure("indeterminate");
  assertParticipantIdentifier(group.ParticipantIdentifier, participant);
  const collection = group.ServiceMetadataReferenceCollection;
  if (collection === "") return [];
  if (!isXmlElement(collection)) throw new DiscoveryFailure("indeterminate");
  const raw = xmlChildren(collection.ServiceMetadataReference);
  if (raw.length > maxReferences) throw new DiscoveryFailure("indeterminate");

  return raw.map((item) => {
    const href = xmlAttribute(item, "href");
    if (!href) throw new DiscoveryFailure("indeterminate");
    const url = safeHttpsUrl(href);
    const lastSegment = url.pathname.split("/").filter(Boolean).at(-1);
    if (!lastSegment) throw new DiscoveryFailure("indeterminate");
    let identifier: string;
    try {
      identifier = decodeURIComponent(lastSegment);
    } catch {
      throw new DiscoveryFailure("indeterminate");
    }
    const separator = identifier.indexOf("::");
    if (separator <= 0) throw new DiscoveryFailure("indeterminate");
    const scheme = identifier.slice(0, separator);
    const value = identifier.slice(separator + 2);
    const relevant = mapPintAnzBillingCapabilities([{
      documentScheme: scheme,
      documentValue: value,
      processScheme: PINT_ANZ_BILLING_PROCESS_SCHEME,
      processValue: PINT_ANZ_BILLING_PROCESS,
      endpoints: [],
      signatureStatus: "not-verified",
    }]).length > 0;
    return { url, identifier, scheme, value, relevant };
  });
}

function parseSignedServiceMetadata(
  xml: string,
  participant: ParticipantIdentifier,
  reference: Pick<DocumentReference, "scheme" | "value">,
): {
  readonly signaturePresent: boolean;
  readonly redirectUrl?: URL;
  readonly redirectCertificateUid?: string;
  readonly advertisement?: Omit<Capability, "kind">;
  readonly processes: string[];
} {
  let root: XmlElement;
  try {
    root = parseSafeXml(xml);
  } catch {
    throw new DiscoveryFailure("indeterminate");
  }
  const signed = root.SignedServiceMetadata;
  if (!isXmlElement(signed)) throw new DiscoveryFailure("indeterminate");
  const signaturePresent = isXmlElement(signed.Signature);
  const metadata = signed.ServiceMetadata;
  if (!isXmlElement(metadata)) throw new DiscoveryFailure("indeterminate");
  const redirect = metadata.Redirect;
  if (isXmlElement(redirect)) {
    const href = xmlAttribute(redirect, "href");
    const certificateUid = xmlText(redirect.CertificateUID);
    if (!href || !certificateUid) throw new DiscoveryFailure("indeterminate");
    return {
      signaturePresent,
      redirectUrl: safeHttpsUrl(href),
      redirectCertificateUid: certificateUid,
      processes: [],
    };
  }

  const information = metadata.ServiceInformation;
  if (!isXmlElement(information)) throw new DiscoveryFailure("indeterminate");
  assertParticipantIdentifier(information.ParticipantIdentifier, participant);
  const document = information.DocumentIdentifier;
  const documentScheme = xmlAttribute(document, "scheme") ?? xmlAttribute(document, "schemeID");
  const documentValue = xmlText(document);
  if (!documentScheme || !documentValue) throw new DiscoveryFailure("indeterminate");
  if (documentScheme !== reference.scheme || documentValue !== reference.value) {
    throw new DiscoveryFailure("indeterminate");
  }

  const processList = information.ProcessList;
  if (!isXmlElement(processList)) throw new DiscoveryFailure("indeterminate");
  const parsed = xmlChildren(processList.Process).map(parseProcess);
  const processes = parsed.map(({ identifier }) => identifier);
  const billing = parsed.find(({ scheme, value }) =>
    scheme === PINT_ANZ_BILLING_PROCESS_SCHEME && value === PINT_ANZ_BILLING_PROCESS,
  );
  if (!billing) return { signaturePresent, processes };

  return {
    signaturePresent,
    processes,
    advertisement: {
      documentScheme,
      documentValue,
      processScheme: billing.scheme,
      processValue: billing.value,
      endpoints: billing.endpoints,
      signatureStatus: "not-verified",
    },
  };
}

function assertParticipantIdentifier(value: unknown, expected: ParticipantIdentifier): void {
  const scheme = xmlAttribute(value, "scheme") ?? xmlAttribute(value, "schemeID");
  const participantValue = xmlText(value);
  if (
    scheme !== expected.metaScheme ||
    !participantValue ||
    participantValue.toLowerCase() !== expected.participantValue.toLowerCase()
  ) {
    throw new DiscoveryFailure("indeterminate");
  }
}

function parseProcess(value: unknown): {
  readonly identifier: string;
  readonly scheme: string;
  readonly value: string;
  readonly endpoints: EndpointMetadata[];
} {
  if (!isXmlElement(value)) throw new DiscoveryFailure("indeterminate");
  const processIdentifier = value.ProcessIdentifier;
  const scheme = xmlAttribute(processIdentifier, "scheme") ?? xmlAttribute(processIdentifier, "schemeID");
  const processValue = xmlText(processIdentifier);
  if (!scheme || !processValue) throw new DiscoveryFailure("indeterminate");
  const endpointList = value.ServiceEndpointList;
  const endpoints = isXmlElement(endpointList)
    ? xmlChildren(endpointList.Endpoint).map(parseEndpoint)
    : [];
  return { identifier: `${scheme}::${processValue}`, scheme, value: processValue, endpoints };
}

function parseEndpoint(value: unknown): EndpointMetadata {
  if (!isXmlElement(value)) throw new DiscoveryFailure("indeterminate");
  const endpointReference = value.EndpointReference;
  const address = isXmlElement(endpointReference) ? xmlText(endpointReference.Address) : undefined;
  let endpointHost: string | null = null;
  if (address) {
    try {
      endpointHost = safeHttpsUrl(address).hostname;
    } catch {
      throw new DiscoveryFailure("indeterminate");
    }
  }
  return {
    endpointHost,
    transportProfile: xmlAttribute(value, "transportProfile") ?? null,
    activationDate: xmlText(value.ServiceActivationDate) ?? null,
    expirationDate: xmlText(value.ServiceExpirationDate) ?? null,
  };
}

async function resolveNaptrWithTimeout(
  resolver: (hostname: string) => Promise<readonly NaptrRecord[]>,
  hostname: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<readonly NaptrRecord[]> {
  if (signal?.aborted) throw new DiscoveryFailure("temporarily-unavailable");
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      callback();
    };
    const timeout = setTimeout(
      () => finish(() => reject(new DiscoveryFailure("temporarily-unavailable"))),
      timeoutMs,
    );
    const abort = () => finish(() => reject(new DiscoveryFailure("temporarily-unavailable")));
    signal?.addEventListener("abort", abort, { once: true });
    resolver(hostname).then(
      (records) => finish(() => resolve(records)),
      (error: unknown) => finish(() => reject(error)),
    );
  });
}

async function fetchWithTimeout(
  fetcher: typeof globalThis.fetch,
  url: URL,
  timeoutMs: number,
  parentSignal?: AbortSignal,
): Promise<Response> {
  if (parentSignal?.aborted) throw new DiscoveryFailure("temporarily-unavailable");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  parentSignal?.addEventListener("abort", abort, { once: true });
  try {
    return await fetcher(url, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": `@pint-anz/lookup/${LOOKUP_VERSION}` },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", abort);
  }
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await cancelBody(response);
    throw new DiscoveryFailure("indeterminate");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new DiscoveryFailure("indeterminate");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof DiscoveryFailure) throw error;
    throw new DiscoveryFailure("temporarily-unavailable");
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(body);
}

async function cancelBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // Status classification is authoritative even when a mocked or broken body cannot be cancelled.
  }
}

function isXmlContentType(value: string | null): boolean {
  if (!value) return false;
  const mediaType = value.split(";", 1)[0]!.trim().toLowerCase();
  return mediaType === "application/xml" || mediaType === "text/xml" ||
    (mediaType.startsWith("application/") && mediaType.endsWith("+xml"));
}

async function retry<T>(
  operation: () => Promise<T>,
  options: ResolvedOptions,
  signal: AbortSignal | undefined,
  classify: (error: unknown) => DiscoveryFailure,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const failure = classify(error);
      if (failure.state !== "temporarily-unavailable" || attempt >= options.maxRetries) throw failure;
      await options.sleep(options.retryDelayMs, signal);
    }
  }
}

function classifyDnsError(error: unknown): DiscoveryFailure {
  if (error instanceof DiscoveryFailure) return error;
  const code = errorCode(error);
  if (NOT_FOUND_DNS.has(code)) return new DiscoveryFailure("not-found");
  if (TRANSIENT_DNS.has(code)) return new DiscoveryFailure("temporarily-unavailable");
  return new DiscoveryFailure("indeterminate");
}

function classifyHttpError(error: unknown): DiscoveryFailure {
  if (error instanceof DiscoveryFailure) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new DiscoveryFailure("temporarily-unavailable");
  }
  if (error instanceof TypeError || errorCode(error)) return new DiscoveryFailure("temporarily-unavailable");
  return new DiscoveryFailure("indeterminate");
}

function errorCode(error: unknown): string {
  if (typeof error !== "object" || error === null || !("code" in error)) return "";
  return String(error.code);
}

function defaultSleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      callback();
    };
    const timeout = setTimeout(() => finish(resolve), milliseconds);
    const abort = () => {
      finish(() => reject(new DiscoveryFailure("temporarily-unavailable")));
    };
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
  });
}
