# 2026-03-12 - Revnet loan-source canonicalization

## Goal

Align the web loan dialog with the canonical revnet loan-source semantics from `@cobuild/wire`.

## Scope

- Remove interface-local fallback behavior that fabricates a borrow source from the base token terminal when `loanSourcesOf` is empty.
- Resolve borrowability against the selected source terminal only.
- Add focused regression coverage around empty-source and alternate-terminal loan-source handling in the dialog adapter.

## Constraints

- Keep wagmi hooks, UI state, and transaction execution local to `interface`.
- Preserve the existing dialog component contract and user-facing flow shape.
- Keep the app compiling without temporary broken states.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

## Status

- Completed.
  Status: completed
  Updated: 2026-03-12
  Completed: 2026-03-12
