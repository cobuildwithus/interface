# 2026-03-10 Final Hard Cutover Sweep

## Goal

Delete the remaining repo-local address wrappers/normalizers and keep protocol notification route-state consumption hard-cut to `@cobuild/wire`.

## Scope

- `apps/web/lib/shared/address.ts`
- remaining `apps/web/**` imports that still consume that wrapper
- remaining local lowercase-only address helpers under `apps/web/**`
- matching notes/docs if file ownership changes materially

## Constraints

- Preserve one-wallet-one-identity behavior.
- Keep notification route hint/state sourced from `wire`.
- Do not add backward-compatibility shims.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

## Status

completed
