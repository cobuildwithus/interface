# 2026-03-10 - Farcaster hosted contract hard cutover

## Goal

Hard-cut the CLI-facing Farcaster signup and hosted x402 routes/services onto the canonical `@cobuild/wire` contract surface with no local compatibility shims.

## Scope

- Replace local Farcaster signup result unions with shared `wire` types/builders.
- Return the canonical hosted x402 response payload from the CLI route/service.
- Update route/service tests to assert only the shared contract.

## Non-Goals

- Broader auth/runtime contract changes outside Farcaster CLI flows.
- Frontend UI changes.
- Release/publish work.

## Risks / Constraints

- Must preserve current CLI bearer-auth and policy boundaries.
- Must keep route error handling aligned with existing CLI HTTP helpers.
- Must not reintroduce backwards-compat response shapes once the shared contract exists.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

## Status

- Hard-cut the CLI-facing Farcaster signup/x402 routes and services onto the shared `wire` contract surface.
- Verification status:
  - `pnpm typecheck` passed while `apps/web` was temporarily linked to the local `wire` checkout for unpublished contract validation.
  - `pnpm --filter web build:ci` passed with the same temporary local-link setup.
  - `pnpm test -- farcaster-signup farcaster-x402 x402-payment` passed.
  - Focused eslint/prettier checks passed for the touched Farcaster files.
  - Full `pnpm lint` still fails because unrelated files already have Prettier drift.
  - Full `pnpm test` still fails in unrelated legacy Farcaster/onramp suites that now see stricter shared address normalization.
  - After restoring the dependency spec/install back to published `@cobuild/wire`, `pnpm typecheck` fails because this repo also depends on other unpublished `wire` surfaces outside this Farcaster plan.
