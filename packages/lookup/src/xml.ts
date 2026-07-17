import { XMLParser, XMLValidator } from "fast-xml-parser";

const FORBIDDEN_XML_DECLARATION = /<!\s*(?:DOCTYPE|ENTITY)\b/i;

/** Error raised when SMP XML cannot be interpreted safely. */
export class UnsafeXmlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeXmlError";
  }
}

export type XmlElement = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  processEntities: false,
  ignoreDeclaration: true,
  allowBooleanAttributes: false,
  parseTagValue: false,
  trimValues: true,
});

/** Parse an SMP XML document while rejecting DTD and entity declarations. */
export function parseSafeXml(xml: string): XmlElement {
  if (FORBIDDEN_XML_DECLARATION.test(xml)) {
    throw new UnsafeXmlError("DTD and entity declarations are not allowed in SMP metadata.");
  }

  if (XMLValidator.validate(xml, { allowBooleanAttributes: false }) !== true) {
    throw new UnsafeXmlError("The SMP response is malformed XML.");
  }

  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch {
    throw new UnsafeXmlError("The SMP response is malformed XML.");
  }

  if (!isXmlElement(parsed) || Object.keys(parsed).length !== 1) {
    throw new UnsafeXmlError("The SMP response must contain exactly one document element.");
  }

  return parsed;
}

export function isXmlElement(value: unknown): value is XmlElement {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function xmlChildren(value: unknown): readonly unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function xmlText(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (!isXmlElement(value)) return undefined;
  const text = value["#text"];
  return typeof text === "string" || typeof text === "number" ? String(text).trim() : undefined;
}

export function xmlAttribute(element: unknown, name: string): string | undefined {
  if (!isXmlElement(element)) return undefined;
  const value = element[`@_${name}`];
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}
