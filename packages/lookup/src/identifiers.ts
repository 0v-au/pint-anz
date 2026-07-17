import type { ParticipantIdentifier, ParticipantInput } from "./types.js";

const META_SCHEME = "iso6523-actorid-upis" as const;
const ABN_SCHEME = "0151";
const NZBN_SCHEME = "0088";
const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19] as const;
const EXPLICIT_PARTICIPANT_PATTERN =
  /^iso6523-actorid-upis::([0-9]{4}):([\x21-\x7e]+)$/;

/** Stable reason why Participant Identifier parsing failed. */
export type ParticipantIdentifierParseErrorCode =
  | "invalid-input"
  | "invalid-format"
  | "invalid-checksum";

/** A non-throwing result from parsing participant input. */
export type ParticipantIdentifierParseResult =
  | {
      /** Whether parsing succeeded. */
      // @example true
      readonly ok: true;
      /** Normalised Participant Identifier. */
      // @example {"source":"participant","metaScheme":"iso6523-actorid-upis","scheme":"9999","value":"example","participantValue":"9999:example","canonical":"iso6523-actorid-upis::9999:example"}
      readonly participant: ParticipantIdentifier;
    }
  | {
      /** Whether parsing succeeded. */
      // @example false
      readonly ok: false;
      /** Stable machine-readable failure reason. */
      // @example "invalid-checksum"
      readonly code: ParticipantIdentifierParseErrorCode;
      /** Safe human-readable failure description. */
      // @example "ABN checksum is invalid."
      readonly message: string;
    };

/**
 * Parse ABN, NZBN, or canonical explicit input into a Participant Identifier.
 * Invalid user input is represented by the result union and never throws.
 */
export function parseParticipantIdentifier(
  input: ParticipantInput,
): ParticipantIdentifierParseResult {
  if (!isParticipantInput(input)) {
    return failure("invalid-input", "Participant input is invalid.");
  }

  const value = input.value.trim();

  switch (input.kind) {
    case "abn":
      return parseAbn(value);
    case "nzbn":
      return parseNzbn(value);
    case "participant":
      return parseExplicitParticipant(value);
  }
}

function parseAbn(value: string): ParticipantIdentifierParseResult {
  if (!/^\d{11}$/.test(value)) {
    return failure("invalid-format", "ABN must contain exactly 11 digits.");
  }

  if (!hasValidAbnChecksum(value)) {
    return failure("invalid-checksum", "ABN checksum is invalid.");
  }

  return success("abn", ABN_SCHEME, value);
}

function parseNzbn(value: string): ParticipantIdentifierParseResult {
  if (!/^\d{13}$/.test(value)) {
    return failure("invalid-format", "NZBN must contain exactly 13 digits.");
  }

  if (!hasValidGlnCheckDigit(value)) {
    return failure("invalid-checksum", "NZBN check digit is invalid.");
  }

  return success("nzbn", NZBN_SCHEME, value);
}

function parseExplicitParticipant(value: string): ParticipantIdentifierParseResult {
  const match = EXPLICIT_PARTICIPANT_PATTERN.exec(value);
  if (!match) {
    return failure(
      "invalid-format",
      "Participant Identifier must use canonical iso6523-actorid-upis::scheme:value form.",
    );
  }

  const [, scheme, participantValue] = match;
  if (scheme === undefined || participantValue === undefined) {
    return failure("invalid-format", "Participant Identifier is invalid.");
  }

  if (scheme === ABN_SCHEME) {
    const abnResult = parseAbn(participantValue);
    if (!abnResult.ok) return abnResult;
  }

  if (scheme === NZBN_SCHEME) {
    const nzbnResult = parseNzbn(participantValue);
    if (!nzbnResult.ok) return nzbnResult;
  }

  return success("participant", scheme, participantValue);
}

function hasValidAbnChecksum(value: string): boolean {
  const total = ABN_WEIGHTS.reduce((sum, weight, index) => {
    const digit = Number(value[index]);
    return sum + (index === 0 ? digit - 1 : digit) * weight;
  }, 0);

  return total % 89 === 0;
}

function hasValidGlnCheckDigit(value: string): boolean {
  const body = value.slice(0, -1);
  const weightedTotal = [...body].reduce((sum, character, index) => {
    const distanceFromRight = body.length - 1 - index;
    const weight = distanceFromRight % 2 === 0 ? 3 : 1;
    return sum + Number(character) * weight;
  }, 0);
  const expectedCheckDigit = (10 - (weightedTotal % 10)) % 10;

  return Number(value.at(-1)) === expectedCheckDigit;
}

function success(
  source: ParticipantInput["kind"],
  scheme: string,
  value: string,
): ParticipantIdentifierParseResult {
  const participantValue = `${scheme}:${value}`;
  return {
    ok: true,
    participant: {
      source,
      metaScheme: META_SCHEME,
      scheme,
      value,
      participantValue,
      canonical: `${META_SCHEME}::${participantValue}`,
    },
  };
}

function failure(
  code: ParticipantIdentifierParseErrorCode,
  message: string,
): ParticipantIdentifierParseResult {
  return { ok: false, code, message };
}

function isParticipantInput(input: ParticipantInput): input is ParticipantInput {
  if (typeof input !== "object" || input === null) return false;

  const candidate = input as { kind?: unknown; value?: unknown };
  return (
    (candidate.kind === "abn" ||
      candidate.kind === "nzbn" ||
      candidate.kind === "participant") &&
    typeof candidate.value === "string"
  );
}
