import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseParticipantIdentifier } from "../src/index.js";

describe("Participant Identifier parsing", () => {
  it("AC-01: validates and normalises participant input", () => {
    const { abn, nzbn } = readOfficialExampleIdentifiers();
    const explicitValue = `${"0".repeat(5)}12340`;

    expect(parseParticipantIdentifier({ kind: "abn", value: ` ${abn} ` })).toEqual({
      ok: true,
      participant: {
        source: "abn",
        metaScheme: "iso6523-actorid-upis",
        scheme: "0151",
        value: abn,
        participantValue: `0151:${abn}`,
        canonical: `iso6523-actorid-upis::0151:${abn}`,
      },
    });

    expect(parseParticipantIdentifier({ kind: "nzbn", value: ` ${nzbn}\n` })).toMatchObject({
      ok: true,
      participant: {
        source: "nzbn",
        scheme: "0088",
        value: nzbn,
      },
    });

    expect(
      parseParticipantIdentifier({
        kind: "participant",
        value: ` iso6523-actorid-upis::0208:${explicitValue} `,
      }),
    ).toEqual({
      ok: true,
      participant: {
        source: "participant",
        metaScheme: "iso6523-actorid-upis",
        scheme: "0208",
        value: explicitValue,
        participantValue: `0208:${explicitValue}`,
        canonical: `iso6523-actorid-upis::0208:${explicitValue}`,
      },
    });

    expect(parseParticipantIdentifier({ kind: "abn", value: changeCheckDigit(abn) })).toMatchObject({
      ok: false,
      code: "invalid-checksum",
    });
    expect(parseParticipantIdentifier({ kind: "nzbn", value: changeCheckDigit(nzbn) })).toMatchObject({
      ok: false,
      code: "invalid-checksum",
    });
    expect(
      parseParticipantIdentifier({
        kind: "participant",
        value: `iso6523-actorid-upis::0151:${changeCheckDigit(abn)}`,
      }),
    ).toMatchObject({ ok: false, code: "invalid-checksum" });

    for (const input of [
      { kind: "abn", value: `${abn.slice(0, 2)} ${abn.slice(2)}` },
      { kind: "nzbn", value: nzbn.slice(0, -1) },
      { kind: "participant", value: `ISO6523-ACTORID-UPIS::0208:${explicitValue}` },
      { kind: "participant", value: `iso6523-actorid-upis:0208:${explicitValue}` },
      { kind: "participant", value: `iso6523-actorid-upis::20:${explicitValue}` },
    ] as const) {
      expect(parseParticipantIdentifier(input)).toMatchObject({
        ok: false,
        code: "invalid-format",
      });
    }
  });

  it("returns an invalid result instead of throwing for malformed runtime input", () => {
    const malformedInputs = [null, undefined, {}, { kind: "abn", value: 123 }];

    for (const input of malformedInputs) {
      expect(() =>
        parseParticipantIdentifier(input as never),
      ).not.toThrow();
      expect(parseParticipantIdentifier(input as never)).toMatchObject({
        ok: false,
        code: "invalid-input",
      });
    }
  });
});

function readOfficialExampleIdentifiers(): { readonly abn: string; readonly nzbn: string } {
  const fixtureDocumentation = readFileSync(
    new URL("../../fixtures/parties.md", import.meta.url),
    "utf8",
  );
  const abn = /\| `0151` \(ABN\) \| `(\d{11})` \|/.exec(fixtureDocumentation)?.[1];
  const nzbn = /\| `0088` \(GLN\/NZBN\) \| `(\d{13})` \|/.exec(fixtureDocumentation)?.[1];

  if (abn === undefined || nzbn === undefined) {
    throw new Error("Official PINT A-NZ example identifiers are missing from fixture provenance.");
  }

  return { abn, nzbn };
}

function changeCheckDigit(value: string): string {
  const checkDigit = Number(value.at(-1));
  return `${value.slice(0, -1)}${(checkDigit + 1) % 10}`;
}
