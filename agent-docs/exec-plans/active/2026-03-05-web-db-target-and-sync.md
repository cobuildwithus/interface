# Web DB Target and Prod->Local Sync

## Goal

Add a deterministic way to run `apps/web` against either prod DB URLs (existing env vars) or a local DB URL, plus a one-command sync path to refresh local non-onchain schemas from prod while explicitly excluding `cobuild-onchain`.

## Scope

- Add DB target selection in `apps/web/lib/server/db/cobuild-db-client.ts`:
  - `WEB_DB_TARGET=prod|local` (default `prod`).
  - Keep existing `DATABASE_URL` + `DATABASE_REPLICA_URL` for prod.
  - Add `LOCAL_DATABASE_URL` for local mode.
  - In local mode, use `LOCAL_DATABASE_URL` for both primary and replica adapters.
- Add `scripts/sync-local-db-from-prod.sh` to copy prod -> local for `cobuild`, `farcaster`, `capital_allocation` only.
- Add root `package.json` scripts:
  - `dev:web:local-db`
  - `dev:web:prod-db`
  - `db:sync:local-from-prod`
- Update docs references for DB topology/commands.

## Constraints

- Do not access `.env` files.
- Preserve current behavior when `WEB_DB_TARGET` is unset.
- Never copy or mutate `cobuild-onchain` in the sync script.
- Keep script non-interactive and deterministic for local dev usage.

## Done

- Added `WEB_DB_TARGET=prod|local` routing in `apps/web/lib/server/db/cobuild-db-client.ts`.
- Added `LOCAL_DATABASE_URL` handling with local primary+replica fallback.
- Added `scripts/sync-local-db-from-prod.sh` for prod->local sync excluding `cobuild-onchain`.
- Added root scripts in `package.json`:
  - `dev:web:local-db`
  - `dev:web:prod-db`
  - `db:sync:local-from-prod`
- Added DB target + sync guidance in `agent-docs/references/server-data-cache-map.md`.
- Completed verification:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm --filter web build:ci`
  - `bash scripts/check-agent-docs-drift.sh`
  - `bash scripts/doc-gardening.sh --fail-on-issues`
- Completion audits run:
  - simplify pass (no behavior-preserving simplifications needed beyond current patch set)
  - test-coverage audit (added DB target routing invariants in `cobuild-db-client.test.ts`)
  - final completion review (script safety guards added to address high-severity misconfig risk)

## Now

- Finalize docs/ledger state and handoff.

## Next

- Move this plan to completed when broader local/prod DB workflow is considered stable.
