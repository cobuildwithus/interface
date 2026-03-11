# 2026-03-11 - Farcaster x402 wire cutover

## Goal

Hard-cut the hosted CLI Farcaster x402 signing flow onto the canonical `@cobuild/wire` signing-request helper while keeping local policy gates and response envelopes unchanged.

## Scope

- Replace local typed-data/domain/payment construction in the hosted signer path.
- Keep route behavior and error handling stable.
- Update focused tests for the hosted Farcaster x402 path.

## Non-Goals

- Broader CLI auth/runtime changes outside Farcaster x402.
- Frontend UI changes.
- Release/publish work.

## Risks / Constraints

- Must preserve the existing CDP signer path and prod policy gating.
- Must not change the hosted response contract returned to CLI callers.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

## Status

- Completed after publishing `@cobuild/wire@0.2.1`: the hosted x402 flow now consumes the shared signing-request helper and passes verification against the published package.
