import { describe, expect, it } from "vitest";

import { lookup } from "../src/lookup.js";
import type { ParticipantInput } from "../src/types.js";

function configuredLiveInput(
  environment: Readonly<Record<string, string | undefined>>,
): ParticipantInput | undefined {
  if (environment.PINT_ANZ_LIVE_LOOKUP !== "1") return undefined;
  const value = environment.PINT_ANZ_LIVE_PARTICIPANT?.trim();
  return value ? { kind: "participant", value } : undefined;
}

describe("live lookup gate", () => {
  it("AC-08: live lookup is explicitly gated", () => {
    expect(configuredLiveInput({})).toBeUndefined();
    expect(configuredLiveInput({ PINT_ANZ_LIVE_LOOKUP: "1" })).toBeUndefined();
    expect(
      configuredLiveInput({
        PINT_ANZ_LIVE_LOOKUP: "1",
        PINT_ANZ_LIVE_PARTICIPANT: "iso6523-actorid-upis::9999:caller-supplied",
      }),
    ).toEqual({
      kind: "participant",
      value: "iso6523-actorid-upis::9999:caller-supplied",
    });
  });
});

const liveInput = configuredLiveInput(process.env);

it.skipIf(liveInput === undefined)(
  "performs an opt-in live smoke lookup for the caller-supplied participant",
  async () => {
    const result = await lookup(liveInput!, { cache: false });
    expect([
      "capable",
      "participant-found-capability-absent",
      "not-found",
      "temporarily-unavailable",
      "indeterminate",
    ]).toContain(result.state);
  },
);
