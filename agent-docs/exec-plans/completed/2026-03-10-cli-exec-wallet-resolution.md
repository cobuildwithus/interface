# Collapse CLI exec wallet resolution into one shared layer

Status: completed
Created: 2026-03-10
Updated: 2026-03-10

## Goal

- Remove the split where `app/api/cli/exec/route.ts` resolves the stored wallet row while `transfer.ts` and `tx.ts` separately resolve the hosted CDP execution context.

## Success criteria

- Hosted CLI exec wallet resolution lives behind one shared server-side helper in `apps/web/lib/server/cli/**`.
- `route.ts` stops reading wallet rows directly.
- `transfer.ts` and `tx.ts` use the shared helper for both replay-time wallet metadata and execution-time smart-account loading.
- Public CLI exec behavior and response contracts remain unchanged.

## Scope

- `apps/web/lib/server/cli/wallet-store.ts`
- `apps/web/app/api/cli/exec/route.ts`
- `apps/web/app/api/cli/exec/transfer.ts`
- `apps/web/app/api/cli/exec/tx.ts`
- focused tests in `apps/web/app/api/cli/exec/*.test.ts`

## Risks

1. Reordering wallet resolution could change default network or replay metadata behavior.
2. Test seams could drift if the new resolver memoization shape is inconsistent across transfer and tx handlers.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`
