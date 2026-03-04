# Server Data and Cache Map

## Postgres Access

- Prisma client wrapper: `lib/server/db/cobuild-db-client.ts`.
- Uses read-replica extension for non-transactional reads.
- Applies connection session safety timeouts (`statement_timeout`, `lock_timeout`, `idle_in_transaction_session_timeout`).

## Key Files

- `apps/web/lib/server/db/cobuild-db-client.ts`
- `apps/web/lib/server/kv/kv-store.ts`
- `apps/web/lib/server/kv/encryption.ts`
- `apps/web/lib/server/cli/token-store.ts`
- `apps/web/lib/server/cli/wallet-store.ts`
- `apps/web/lib/domains/goals/goal-data.ts`
- `apps/web/lib/domains/goals/action-card-read.ts`
- `apps/web/lib/domains/token/onchain/revnet-data.ts`
- `apps/web/lib/domains/token/onchain/project-stats.ts`
- `apps/web/lib/domains/token/onchain/eth-price.ts`

## KV and Encrypted Storage

- KV helpers: `lib/server/kv/kv-store.ts`.
- Encryption helpers: `lib/server/kv/encryption.ts`.
- Goal card read-state KV usage: `lib/domains/goals/action-card-read.ts`.

## Cached Server Reads

Examples:

- revnet data cache: `lib/domains/token/onchain/revnet-data.ts`
- project stats cache: `lib/domains/token/onchain/project-stats.ts`
- ETH price fallback cache: `lib/domains/token/onchain/eth-price.ts`
- goal page data cache: `lib/domains/goals/goal-data.ts` (`goal_treasury`, `goal_treasury_series`, and related project/activity reads)

CLI note:

- CLI token/wallet/tx-log reads and writes are DB-backed only (no cache layer), with bearer-token auth state persisted via hashed token rows.
- `cli_tx_logs` also stores optional idempotency keys and enforces uniqueness on `(ownerAddress, agentKey, idempotencyKey)` for replay-safe exec calls.

## Consistency Guidance

- Use primary-safe reads where read-after-write correctness is required.
- Keep cache fallback behavior explicit and safe when upstream data is unavailable.
- Avoid cache keys that mix canonical and non-canonical address casing.

## Failure Modes and Handling

1. Replica lag for consistency-sensitive paths:

- Use primary-safe reads and avoid stale assumptions where correctness matters.

2. KV/cache failure:

- Degrade gracefully with explicit fallback behavior and bounded user-facing impact.

3. Encryption helper misuse:

- Keep encrypted KV access centralized in server-only modules and avoid client exposure.

## Update Rule

If DB topology, cache strategy, or KV/encryption behavior changes, update this file and `agent-docs/RELIABILITY.md`.
