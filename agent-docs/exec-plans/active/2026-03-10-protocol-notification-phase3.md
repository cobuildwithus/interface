# 2026-03-10 Protocol Notification Phase 3

## Goal

Support actionable financial/exposure protocol notifications in the web inbox without changing the inbox schema or ownership model.

## Scope

- Extend protocol-notification SQL materialization to honor stateful outbox actions.
- Add presentation copy for `underwriter_withdrawal_prep_required`, `underwriter_withdrawal_prep_complete`, `premium_claimable`, and `premium_claimed`.
- Keep the existing inbox UI query and route model intact.

## Constraints

- Preserve the single `cobuild.notifications` inbox contract.
- Keep one semantic reason per notification and let payload role drive wording.
- Do not add operator-alert rendering in this phase.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

## Outcome

- Updated protocol notification presentation for the four new actionable financial/exposure reasons.
- Extended protocol notification SQL materialization to collapse same-batch state rows and apply `invalidate` actions without recreating inbox rows.
- Repo verification passed for the touched web app surfaces.
