# Wire ABI sync

## Goal

Consume the published `@cobuild/wire@0.3.5` package in `interface` and keep the goal-create experience aligned with the new GoalFactory ABI surface.

## Constraints

- Preserve the existing goal-create flow and validation model.
- Keep the UI rooted in the published shared `wire` helpers instead of duplicating calldata logic locally.
- Update tests alongside any goal-create request-shape changes.

## Scope

- Bump `@cobuild/wire` in `apps/web` and `apps/contracts`.
- Replace stale `deployGoal` assumptions in the web goal-create flow with the shared write-contract request surface.
- Keep user-facing defaults/copy aligned with the current open-goal deployment path.

## Verification

- `pnpm --filter web typecheck`
- `pnpm --filter web test`
- `pnpm --filter web build`
- `pnpm --filter contracts generate`
