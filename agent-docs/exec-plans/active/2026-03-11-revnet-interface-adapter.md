# 2026-03-11 - Revnet interface adapter cutover

## Goal

Adopt the new canonical `@cobuild/wire` revnet surface inside the web app while keeping React hooks, caching, and UI state in `interface`.

## Scope

- Replace interface-local revnet payment/cash-out/loan math and write sequencing with `@cobuild/wire` helpers.
- Replace interface-local issuance timeline transforms with the shared wire builders while preserving the existing UI data contract.
- Keep SWR, `unstable_cache`, wagmi hooks, toasts, and dialogs local to the app.

## Constraints

- Do not move UI code or Next.js cache wrappers into `wire`.
- Preserve existing end-user behavior and current route/component contracts.
- Keep the tree compiling without temporary broken states.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

## Status

- In progress.
