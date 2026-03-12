# Server Data and Cache Map

## Postgres Access

- Prisma client wrapper: `lib/server/db/cobuild-db-client.ts`.
- Uses read-replica extension for non-transactional reads.
- Applies connection session safety timeouts (`statement_timeout`, `lock_timeout`, `idle_in_transaction_session_timeout`).
- DB target env routing:
  - `WEB_DB_TARGET=prod|local` (default `prod`).
  - Prod mode uses `DATABASE_URL` + `DATABASE_REPLICA_URL`.
  - Local mode uses `LOCAL_DATABASE_URL` for both primary and replica adapters.
- Local refresh helper: `scripts/sync-local-db-from-prod.sh` copies only `cobuild`, `farcaster`, and `capital_allocation` schemas from prod and intentionally excludes `cobuild-onchain`.
  - Safety guards fail when source/target URLs match and always require a local `LOCAL_DATABASE_URL` host.
  - The sync helper auto-loads `apps/web/.env` and `apps/web/.env.local` for `DATABASE_URL` and `LOCAL_DATABASE_URL` when those vars are not already exported in the shell.
  - For libpq tools (`pg_dump`), source URLs using `sslmode=verify-ca|verify-full` automatically add `sslrootcert=system` when no explicit root cert path is provided.
  - Before restore, the helper runs `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;` on `LOCAL_DATABASE_URL` so pgvector-backed columns/indexes can be restored.
  - The command is available from both the repo root and `apps/web` as `pnpm db:sync:local-from-prod`.

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
- auth session cache: `lib/domains/auth/session.ts` uses request-scoped React caching so repeated `getSession()` calls during one server render do not re-verify the Privy token or re-run linked-account enrichment work.

CLI note:

- CLI token/wallet/tx-log reads and writes are DB-backed only (no cache layer), with bearer-token auth state persisted via hashed token rows.
- `cli_tx_logs` also stores optional idempotency keys and enforces uniqueness on `(ownerAddress, agentKey, idempotencyKey)` for replay-safe exec calls.
- Hosted exec state is persisted per request as `pending` (reservation), `submitted`/`timed_out` (user op hash known, safe to resume), `confirmed` (tx hash known), `failed`, or `expired`.
- Notifications are DB-backed only: `cobuild.notifications` stores wallet inbox rows and `cobuild.notification_state` stores the wallet read cursor. These do not use KV caching.

## Consistency Guidance

- Use primary-safe reads where read-after-write correctness is required.
- Keep cache fallback behavior explicit and safe when upstream data is unavailable.
- Avoid cache keys that mix canonical and non-canonical address casing.
- When the server already resolved linked-account or signer state for the current request, pass that data into the matching client React Query hooks as initial data instead of immediately issuing a second request.
- Settings social surfaces should reuse one server-side social-state helper per request so linked-account reads, signer status, and the derived Farcaster profile view stay consistent across the page.

## Failure Modes and Handling

1. Replica lag for consistency-sensitive paths:

- Use primary-safe reads and avoid stale assumptions where correctness matters.

2. KV/cache failure:

- Degrade gracefully with explicit fallback behavior and bounded user-facing impact.

3. Encryption helper misuse:

- Keep encrypted KV access centralized in server-only modules and avoid client exposure.

4. Notification read-state drift:

- Notifications unread state is derived from a DB cursor (`last_read_at`) against notification `created_at`; the read route accepts an opaque microsecond watermark string so read-after-write paths do not truncate Postgres timestamp precision. Do not mix notification unread logic with the KV-backed topic read model.

## Update Rule

If DB topology, cache strategy, or KV/encryption behavior changes, update this file and `agent-docs/RELIABILITY.md`.
