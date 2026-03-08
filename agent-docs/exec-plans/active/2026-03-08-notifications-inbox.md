# 2026-03-08 Notifications Inbox

## Goal

Implement a wallet-scoped notifications inbox with a new `/notifications` page, unread badge, DB-backed read cursor, and materialized discussion notifications that can later share the same lane with onchain events.

## Scope

- Add notification schema and SQL materialization primitives in `interface`.
- Add notification queries, unread count, read cursor updates, page route, and sidebar badge in `interface`.
- Hook discussion notification materialization into app-authored Farcaster reply posting.
- Hook discussion notification materialization into `farcaster-ingestion` cast upserts so imported replies and mentions create inbox rows.
- Add tests/docs for notification semantics and edge cases.

## Constraints

- Wallet-scoped inbox only for v1; no account-identity abstraction.
- Discussion v1 includes `mention`, `reply_to_reply`, and `reply_to_root`; excludes likes, recasts, and follows.
- Reason precedence is `mention` > `reply_to_reply` > `reply_to_root`.
- Read state is a DB cursor, not KV and not row-level booleans.
- Use verified Farcaster addresses for discussion notification fanout.
- Keep notification materialization semantics shared across `interface` and `farcaster-ingestion`.

## Verification

- Completion workflow audits: simplify -> test-coverage-audit -> task-finish-review.
- Interface required checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:coverage`, `pnpm --filter web build:ci`.
- Farcaster-ingestion required checks: `pnpm build`, `pnpm test`, `pnpm typecheck`.
