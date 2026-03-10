# 2026-03-10 Protocol Address And Helper Surface

## Goal

Replace the duplicated shared Base address tables in `interface` with the published `@cobuild/wire` exports while keeping app-only values local.

## Scope

- Refactor `apps/contracts/addresses.ts` and the mirrored web onchain address module to source shared canonical addresses from `@cobuild/wire`.
- Preserve app-only constants such as local ETH price fallback values when they are not shared protocol source-of-truth data.
- Update address consumers only as needed to keep existing behavior.
- Bump `@cobuild/wire` to the released version.

## Constraints

- Hard cutover only; no duplicated canonical Base tables should remain owned here after the change.
- Do not touch unrelated chat or notification work.
- Keep wagmi generation inputs valid after the address refactor.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

## Status

completed
