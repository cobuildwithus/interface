# Identity Address Normalization

## Goal

Cut the hosted CLI web surface to the shared `wire` address, Base-network, and verified-claims principal helpers.

## Success Criteria

- Session address normalization and bearer auth use shared `wire` contracts.
- CLI network canonicalization/explorer lookup is aligned with other repos.
- Repo-local duplicate normalization logic is removed or reduced to thin wrappers only.

## Scope

- `apps/web/lib/shared/address.ts`
- `apps/web/lib/server/cli/auth.ts`
- `apps/web/lib/server/cli/env.ts`
- `apps/web/lib/server/cli/explorer.ts`
- `apps/web/lib/server/cli/wallet-store.ts`
- matching tests/docs if behavior notes need updates

## Out Of Scope

- Farcaster payload/schema contract work.
- Unrelated chat-grant or notification work already in progress.

## Risks / Constraints

- Preserve one-wallet-one-identity behavior.
- Keep Base-only cutover behavior exact.
- Do not introduce backward-compatibility shims.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

## Current Status

- The shared-wire cutover is implemented and focused CLI auth/env/explorer tests pass.
- `pnpm typecheck` is currently blocked by a pre-existing syntax error in `app/api/cli/farcaster/signup/route.ts`.
- Full `pnpm test` is currently blocked by unrelated repo failures, including the same Farcaster route syntax issue plus missing worker/runtime dependencies in unrelated suites.
