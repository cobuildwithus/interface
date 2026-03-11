# 2026-03-11 DB-Owned Discussion Visibility Consumers

## Goal

Cut notification consumer visibility logic over to the new DB-owned discussion visibility helpers so app queries stop restating discussion visibility rules locally.

## Scope

- Update wallet notification queries in `apps/web/lib/domains/notifications/queries.ts` to call the new DB helper.
- Add regression coverage in `apps/web/lib/domains/notifications/queries.test.ts`.
- Avoid edits to the SQL migration file in this task because that file is already owned by another active entry.

## Constraints

- Keep `@cobuild/wire` notification presentation helpers authoritative for payload normalization and app paths.
- Preserve current unread cursor, pagination, and payload behavior.
- Do not reintroduce repo-local discussion visibility predicates after the DB cutover.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

## Coverage Audit

- 2026-03-11 post-simplify audit found one meaningful regression gap: the existing SQL-shape test pinned DB helper usage for unread-state queries only, while `getNotificationsPage()` also issues page count, watermark, and row-fetch SQL that must continue using the DB-owned visibility helper.
- Added a focused regression in `apps/web/lib/domains/notifications/queries.test.ts` that inspects the mocked page-query SQL and asserts each page query still calls `cobuild.notification_row_is_visible(...)` while omitting the old local discussion-rule fragments.
- Focused verification for the added regression: `pnpm --filter web exec vitest run lib/domains/notifications/queries.test.ts --coverage.enabled=false` (pass).
  Status: completed
  Updated: 2026-03-11
  Completed: 2026-03-11
