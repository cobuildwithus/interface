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

- Completed 2026-03-12.

## Delivered Follow-ups

- Moved `useRevnetPosition` off local `wagmi` read orchestration and onto the canonical wire read helpers, keeping only React query wiring and UI formatting inside `interface`.
- Replaced the cash-out dialog's local reclaim quote path with the shared wire quote helper so app-side fee math and terminal selection stay downstream of the shared source of truth.
- Preserved the current component contracts while shrinking app-local REVNET drift surfaces.
  Status: completed
  Updated: 2026-03-12
  Completed: 2026-03-12
