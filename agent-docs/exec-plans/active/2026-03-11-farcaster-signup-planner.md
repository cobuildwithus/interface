# Hosted Farcaster signup planner cutover

Status: complete
Created: 2026-03-11
Updated: 2026-03-11

## Goal

- Replace the hosted Farcaster signup route/service’s duplicated signup state machine with the shared `@cobuild/wire` planner while keeping smart-account lookup and user-op submission local.

## Success criteria

- Hosted signup consumes the shared planner and shared extra-storage normalization from `wire`.
- The route keeps only request validation, auth, and transport-specific execution concerns.
- Existing hosted signup result/error behavior remains on the canonical shared contract.

## Scope

- In scope:
  - Update the hosted signup service to use the shared planner.
  - Remove local extra-storage drift from the API route by delegating to shared normalization.
  - Adjust affected tests/docs for the hosted signup path.
- Out of scope:
  - Frontend UI changes.
  - Non-signup Farcaster hosted flows.

## Constraints

- Technical constraints:
  - Preserve CLI bearer-auth and smart-account execution boundaries.
  - Keep transport-specific user-op send/wait logic local to `interface`.
- Product/process constraints:
  - Hard cutover only; do not keep a second local planner path.

## Risks and mitigations

1. Risk: Hosted validation and shared normalization may disagree on accepted `extraStorage` values.
   Mitigation: Route parsing will defer to the shared Farcaster extra-storage helper and preserve current request error handling.
2. Risk: Shared planner adoption could accidentally change already-registered or funding-required behavior.
   Mitigation: Keep preflight/result construction on the existing shared `wire` DTOs and cover the service path with tests.

## Tasks

1. Replace the hosted signup service’s local signup planning with the shared `wire` planner.
2. Move route-level `extraStorage` normalization onto the shared helper contract.
3. Update hosted signup tests and docs as needed.

## Decisions

- `interface` will own only smart-account resolution, request-signer generation/signing, and user-op submission/waiting once the shared planner is available.

## Verification

- Commands to run:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm test:coverage`
  - `pnpm --filter web build:ci`
- Expected outcomes:
  - Hosted signup compiles and passes the repo’s required checks against the shared planner surface.
- Result:
  - `pnpm typecheck`, `pnpm test`, `pnpm test:coverage`, and `pnpm --filter web build:ci` passed on 2026-03-11.
  - `pnpm lint` still fails on the pre-existing unrelated formatting drift in `apps/web/lib/domains/notifications/protocol-materialization-sql.test.ts`.
