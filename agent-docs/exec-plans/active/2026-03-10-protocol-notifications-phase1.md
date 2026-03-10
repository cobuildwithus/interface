# 2026-03-10 Protocol Notifications Phase 1

## Goal

Materialize phase-1 protocol notification intents into the existing wallet inbox and render them cleanly in the web notifications UI.

## Scope

- Add SQL materialization for indexer-owned protocol notification outbox rows.
- Keep `cobuild.notifications` and `cobuild.notification_state` as the single inbox/read model.
- Add protocol-specific titles, excerpts, actor labels, and deep-link routing in the web inbox.

## Constraints

- No backward-compatibility/backfill work for a prior live deployment.
- Keep the existing inbox table as the only user-facing notifications lane.
- Do not add a separate operator lane in this pass.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`
