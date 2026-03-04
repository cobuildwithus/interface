# 2026-03-04 Goal Treasury Query Cutover

## Goal

Update interface goal-domain queries to consume deterministic indexer linkage fields and precomputed treasury series, removing heuristic project matching and recipientId-based budget joins.

## Scope

- Update Prisma models in `apps/web/prisma/cobuild.prisma` for new goal/recipient/series indexer fields.
- Refactor `apps/web/lib/domains/goals/goal-data.ts` to:
  - resolve project links via canonical goal treasury fields,
  - resolve routes via canonical slug/domain fields,
  - consume `goal_treasury_series` for chart data,
  - map subgoal budgets via stable `flowRecipient.budgetTreasury`.
- Update coverage tests for goal-domain query behavior.
- Update server data/cache reference docs for the new read surfaces.

## Constraints

- Hard cutover only; no fallback to owner/deployer/erc20 heuristic matching.
- Keep one-wallet identity and server-only boundaries unchanged.
- Maintain deterministic/explicit query filters with lowercase canonical addresses.

## Verification

- Completion workflow audits: simplify -> test-coverage-audit -> task-finish-review.
- Required checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:coverage`, `pnpm --filter web build:ci`.
