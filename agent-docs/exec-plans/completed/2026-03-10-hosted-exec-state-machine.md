# 2026-03-10 Hosted Exec State Machine

## Goal

Make hosted `/api/cli/exec` idempotency state naming explicit so reservation state is distinct from submitted user operations, while preserving replay-safe resume behavior for the CLI.

## Scope

- `apps/web/app/api/cli/exec/**`
- `apps/web/prisma/cobuild.prisma`
- Matching hosted exec docs/tests

## Constraints

- Preserve the current public hosted exec response contract for `202 pending` and confirmed replay responses.
- Keep CLI resume behavior keyed on the same idempotency key and stored `userOpHash`.
- Do not widen scope into wallet provisioning, auth, or non-exec routes.

## Planned Changes

1. Rename reservation-only DB/runtime state away from `pending`.
2. Keep `submitted(userOpHash)` as the canonical post-send state.
3. Clarify timeout handling for stale submitted records without breaking resumable retries.
4. Update tests/docs to match the explicit state model.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

## Status

In progress.
Status: completed
Updated: 2026-03-10
Completed: 2026-03-10
