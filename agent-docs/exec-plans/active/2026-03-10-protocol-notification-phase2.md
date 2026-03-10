# 2026-03-10 Protocol Notification Phase 2

## Goal

Support phase-2 protocol notification delivery and rendering for budget-underwriter and juror dispute flows.

## Scope

- Add SQL materialization for scheduled protocol notification rows.
- Extend protocol presentation copy for new underwriter and juror reasons.
- Use `payload.role` to personalize request-actor copy and consume `proposer` role semantics from `indexer`.
- Keep the existing inbox query model unchanged.

## Constraints

- Preserve the single `cobuild.notifications` inbox contract.
- Keep SQL materialization idempotent on `(recipient_wallet_address, source_type, source_id)`.
- Avoid discussion-query regressions.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`
