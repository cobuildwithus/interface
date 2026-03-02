# 2026-03-02 - Build-bot Farcaster x402 payment route

## Goal

Add an authenticated build-bot API route that returns a one-time x402 payment header payload for Farcaster cast submits, signed by the deterministic agent owner server wallet.

## Scope

- Add `POST /api/buildbot/farcaster/x402-payment`.
- Add server-only payment builder/signing module under build-bot libs.
- Reuse existing bearer-auth and agent wallet identity model.
- Return `xPayment` plus payer metadata needed by CLI observability.

## Non-Goals

- Posting casts from the server.
- Storage/secret redesign.
- Compatibility shims for legacy endpoints.

## Risks / Constraints

- Must not expose wallet secrets.
- Must keep route validation/error model aligned with existing build-bot endpoints.
- Signature must match USDC EIP-3009 typed-data format expected by Neynar x402.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`
