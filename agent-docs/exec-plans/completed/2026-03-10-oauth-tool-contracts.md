# 2026-03-10 OAuth Tool Contract Cutover

## Goal

Cut the web-owned CLI OAuth authorize route over to the shared `@cobuild/wire` OAuth request/response helpers.

## Scope

- Replace local authorize-body coercion with shared `wire` validation.
- Replace local upstream authorize-code payload parsing with shared `wire` parsing.
- Keep the web route response shape stable (`{ ok, redirectTo }`).

## Constraints

- Hard cutover only.
- Preserve same-origin enforcement and CLI-session auth checks.
- Do not touch unrelated chat or notification work.

## Planned Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

## Verification Outcome

- `pnpm typecheck` passed.
- `pnpm lint` failed on unrelated formatting in untracked `apps/web/lib/server/cli/env.test.ts`.
- `pnpm test` failed outside scope in `lib/server/onramp-url.test.ts` and `lib/server/farcaster-register.test.ts` because other workspace `wire` changes now enforce stricter address normalization.
- `pnpm test:coverage` failed on the same unrelated test files.
- `pnpm --filter web build:ci` passed.
- Focused route coverage for this task passed in `app/api/cli/oauth/authorize/route.test.ts`.

## Status

completed
