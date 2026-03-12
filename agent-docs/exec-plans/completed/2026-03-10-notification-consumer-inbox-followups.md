# 2026-03-10 Notification Consumer Inbox Follow-ups

## Goal

Add web-inbox regression coverage for scheduled protocol notification rows and tighten consumer behavior only where the current app surface is still weaker than the indexed notification contract.

## Scope

- Validate unread/watermark behavior for scheduled protocol rows in the existing inbox query path.
- Extend query/presentation tests using current shared `wire` notification helpers.
- Improve consumer-side behavior only when an existing bug is reproducible without waiting on new reason names from upstream tracks.

## Constraints

- Keep `@cobuild/wire/protocol-notifications` authoritative for route focus, hints, and presentation.
- Do not add repo-local notification presenters or route-state forks.
- Avoid unrelated chat, OAuth, or address-surface files.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`
  Status: completed
  Updated: 2026-03-12
  Completed: 2026-03-12
