# DB-Backed Prerender Safety

## Goal

Stop production builds from failing when fixed app routes try to prerender against a build environment without live DB access, and make the repo rule explicit so future pages do not reintroduce the pattern.

## Scope

- Audit fixed `apps/web/app/**/page.tsx` routes for build-time DB access.
- Mark confirmed build-unsafe fixed routes as dynamic.
- Add an explicit repo-local rule for DB-backed App Router pages.
- Verify both the targeted full build path and the required repo checks.

## Constraints

- Do not access `.env` files.
- Prefer the smallest safe route-level fix over broad app-wide dynamic rendering.
- Do not weaken runtime correctness by silently swallowing DB failures in data loaders.

## Done

- Marked `apps/web/app/(app)/goals/page.tsx` as `dynamic = "force-dynamic"`.
- Marked `apps/web/app/(app)/events/page.tsx` as `dynamic = "force-dynamic"`.
- Added explicit DB-backed prerender safety rules in:
  - `apps/web/AGENTS.md`
  - `agent-docs/RELIABILITY.md`
  - `agent-docs/references/app-router-and-data-flow.md`
- Kept prerender-safety regression tests for both routes:
  - `apps/web/app/(app)/goals/page.test.ts`
  - `apps/web/app/(app)/events/page.test.ts`
- Verified the original failure progression and fix:
  - before patch: `pnpm build` failed on `/goals`, then on `/events`, due to missing `goal_treasury`
  - after patch: `pnpm build` passed with the DB unavailable

## Verification

- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

## Audit Notes

- Simplify pass: no further behavior-preserving simplification needed beyond the route-level `dynamic` exports and explicit repo rule.
- Coverage pass: existing route tests assert `dynamic = "force-dynamic"` for both patched pages and passed under `pnpm test` and `pnpm test:coverage`.
- Completion audit: no remaining correctness or security findings in the modified call paths after build and required checks passed.
