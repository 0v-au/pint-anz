# Prompt: build the PINT A-NZ playground

You are implementing `packages/playground` in the PINT A-NZ Toolkit monorepo.
Read the root documentation, inspect the validator and fixtures, and preserve
unrelated changes. First write down the protocol boundary: this is a local test
counterparty, not a production Peppol Access Point.

## Goal

Deliver a Dockerised local service to which developers can submit PINT A-NZ
documents and receive deterministic, scripted counterparty outcomes including
acceptance, business rejection, delay, and controlled transport misbehaviour.

## Requirements

- Provide a small HTTP API and CLI/examples for submission, status polling, and
  scenario reset/configuration. Version the API and scenario schema.
- Validate submitted XML through `@pint-anz/lint`, retain the structured result,
  and make clear whether a response came from validation or scripted behaviour.
- Ship named deterministic scenarios: accept, reject by validation result,
  business reject, delayed response, timeout, transient error, duplicate
  handling, out-of-order completion, and malformed response. Random behaviour
  must require an explicit seed.
- Implement a transparent state machine with correlation IDs, idempotency rules,
  bounded storage, reset behaviour, and inspectable event history.
- Make the container non-root, health-checkable, small, and usable without
  external network access. Persist data only when a volume is intentionally
  configured.
- Treat all uploaded XML as untrusted: limit request/document size, disable XML
  external entities, avoid shell execution, sanitise logs, and do not expose the
  host filesystem or Docker socket.
- Add unit tests for the state machine and scenarios, contract tests for the API,
  fixture-based integration tests, and a Docker smoke test using health and
  submission endpoints.
- Document quick start, ports, API/scenario examples, limitations, data lifecycle,
  troubleshooting, and how downstream clients can use it in CI.

## Non-goals

Do not emulate a certified Access Point, connect to production/test Peppol
networks, implement AS4 unless separately specified, or claim a successful local
scenario proves network interoperability.

## Done when

One documented command starts a healthy container; fixture submissions exercise
every scenario reproducibly; restart/reset/idempotency behaviour is tested;
offline operation and security limits are verified; and CI can run the smoke
test without production credentials. Report commands run and protocol features
intentionally left out.
