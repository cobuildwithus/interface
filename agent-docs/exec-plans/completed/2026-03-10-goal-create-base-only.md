# 2026-03-10 Goal Create Base Only

## Goal

Align the interface hosted CLI execution path to the Base-only protocol direction while keeping goal-create helper adoption deferred to the main shared-wire work.

## Scope

- Remove Base Sepolia support from hosted CLI execution routes, wallet defaults, explorer links, and related docs/tests.
- Leave the goal-create form untouched in this slice unless a later dependency forces it.

## Constraints

- Keep hosted CLI execution aligned with the CLI command/runtime contract.
- Do not edit the goal-create form in this slice.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

Status: completed
Updated: 2026-03-10
Completed: 2026-03-10
