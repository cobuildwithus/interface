# 2026-03-10 Goal Create Wire Cutover

## Goal

Replace the web goal-create form's local deploy-param and receipt-decode logic with shared `wire` helpers so the form matches the current GoalFactory contract shape.

## Scope

- Refactor `CreateGoalForm` to use shared goal-create builders/decoders from `wire`.
- Add explicit spend-policy inputs if no canonical Base defaults are available in repo-local source of truth.
- Keep wallet/auth transaction orchestration unchanged.

## Constraints

- Do not touch unrelated chat or notification work.
- Keep the page functional on desktop and mobile.
- Do not invent hidden protocol defaults when the source of truth is missing.

## Planned Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`
