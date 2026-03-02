# 2026-03-02 - Build-bot Farcaster signup with CDP smart accounts on Optimism

## Goal

Add an authenticated build-bot API that performs protocol-native Farcaster signup and signer registration using CDP smart accounts on Optimism, including smart-account EIP-712 typed-data signing for SignedKeyRequest metadata.

## Scope

- New server service for Farcaster signup/signer registration steps.
- New `/api/buildbot/farcaster/signup` route.
- Recovery-address behavior: request override optional, default to authenticated owner address.
- Funding checks and explicit errors for already-registered FIDs.
- Tests for route/service happy and failure paths.

## Non-Goals

- Replacing existing user-facing Neynar signup flows.
- Posting/broadcasting casts.
- Non-Optimism network support.

## Risks / Constraints

- Must use existing build-bot bearer auth boundaries.
- Must avoid broad policy bypass outside this dedicated route.
- Must keep deterministic build-bot wallet model unchanged.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`
