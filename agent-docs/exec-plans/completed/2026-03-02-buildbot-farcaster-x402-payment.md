# 2026-03-02 - CLI Farcaster x402 payment route

## Goal

Add an authenticated CLI API route that returns a one-time x402 payment header payload for Farcaster cast submits, signed by the deterministic agent owner server wallet.

## Scope

- Add `POST /api/cli/farcaster/x402-payment`.
- Add server-only payment builder/signing module under CLI libs.
- Reuse existing bearer-auth and agent wallet identity model.
- Return `xPayment` plus payer metadata needed by CLI observability.

## Non-Goals

- Posting casts from the server.
- Storage/secret redesign.
- Compatibility shims for legacy endpoints.

## Risks / Constraints

- Must not expose wallet secrets.
- Must keep route validation/error model aligned with existing CLI endpoints.
- Signature must match USDC EIP-3009 typed-data format expected by Neynar x402.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`
  Status: completed
  Updated: 2026-03-12
  Completed: 2026-03-12
