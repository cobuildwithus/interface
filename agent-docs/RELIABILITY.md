# Reliability

## Core Invariants

1. One wallet = one active user identity across UI/auth/server behavior.
2. Onchain writes must use shared transaction lifecycle hooks.
3. Consistency-sensitive reads should avoid stale replica assumptions.
4. Cache-backed flows must tolerate cache/lock failure with safe fallbacks.
5. Fixed App Router pages must not require live DB access during build-time prerender unless a build-safe fallback is intentional and documented.

## Reliability-Critical Surfaces

### Auth + identity

- Session source: `lib/domains/auth/session.ts`.
- Client identity enforcement: `components/features/auth/wallet-identity-guard.tsx`.
- Auth-gated action entrypoint: `components/ui/auth-button.tsx`.

### Onchain execution

- Shared transaction lifecycle: `lib/domains/token/onchain/use-contract-transaction.ts`.
- Swap/write orchestration: `lib/hooks/use-swap-core.ts`, `lib/hooks/use-revnet-pay.ts`.
- Cached read dependencies: `lib/domains/token/onchain/revnet-data.ts`, `project-stats.ts`, `eth-price.ts`.

### Data and cache

- DB client + read-replica extension: `lib/server/db/cobuild-db-client.ts`.
- KV persistence/encryption: `lib/server/kv/kv-store.ts`, `lib/server/kv/encryption.ts`.
- Goal action card read-state caching: `lib/domains/goals/action-card-read.ts`.

## Common Failure Modes and Expected Behavior

1. Missing or invalid user session

- API routes should return explicit unauthorized responses where required.

2. Wallet switched mid-session

- `WalletIdentityGuard` triggers logout and re-auth flow.

3. Onchain write user rejection

- Transaction helper dismisses pending toast without false error state.

4. External integration failure (Coinbase/Farcaster/Cloudflare)

- Route handlers should return bounded user-facing errors, not raw stack traces.

5. Cache or KV failure

- Flows should degrade gracefully (empty/fallback state) where safe.

6. Build environment lacks live DB access for a fixed route

- The route must opt out of prerendering with `dynamic = "force-dynamic"` unless the page is intentionally static with a documented build-safe fallback.

## Verification Matrix

- Baseline: `pnpm lint`, `pnpm typecheck`, `pnpm test`
- Build safety: `pnpm --filter web build:ci`
- Doc consistency: `bash scripts/check-agent-docs-drift.sh`
- Doc freshness: `bash scripts/doc-gardening.sh --fail-on-issues`

## High-Value Tests to Keep Healthy

- Auth/session hooks and guards.
- Onchain transaction hooks and quote logic.
- API route handler tests for auth/validation/error semantics.
- Server DB/KV helper tests.
