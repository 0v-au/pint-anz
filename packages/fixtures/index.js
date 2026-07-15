import manifest from "./manifest.json" with { type: "json" };

const fixturesById = new Map(manifest.fixtures.map((fixture) => [fixture.id, fixture]));

export { manifest };

export function fixtureUrl(id) {
  const fixture = fixturesById.get(id);
  if (!fixture) {
    throw new RangeError(`Unknown PINT A-NZ fixture: ${id}`);
  }

  return new URL(fixture.path, import.meta.url);
}
