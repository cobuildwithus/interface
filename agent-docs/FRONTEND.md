# Frontend

## Layering Rules

### Route and page layer (`apps/web/app/**`)

- Composes domain calls and UI; avoid embedding deep business logic directly in page files.
- Reads should prefer server components and server data helpers.
- Route handlers under `app/api/**` are boundary points for request validation and output shaping.

### Component layer (`apps/web/components/**`)

- `components/ui/**`: primitives and low-level reusable controls.
- `components/features/**`: domain-specific UI orchestrators.
- `components/layout/**` and `components/common/**`: shared shell and common presentation blocks.
- Components should not directly own cross-domain persistence logic.

### Domain/integration layer (`apps/web/lib/**`)

- `lib/domains/**`: domain behavior and data transformations.
- `lib/integrations/**`: external API adapters and transport wrappers.
- `lib/shared/**`: pure helpers and common formatting/utilities.

### Server layer (`apps/web/lib/server/**`)

- Server-only DB/KV/side-effect paths.
- Must stay free of client imports.
- Consistency-sensitive reads/writes should be explicit about primary/replica behavior.

## Server/Client Boundary Rules

- Default to server components for reads.
- Use client components for interaction-heavy UI and wallet-connected behavior.
- Use `"use server"` modules only for async server action exports.
- Keep auth-gated UI actions using `AuthButton` and auth hooks.
- When multiple server leaves need the same auth state, resolve `getSession()` once per request and prefer passing session/address props from the parent route or section instead of re-reading auth in each leaf.
- App-owned client fetch hooks should use the shared React Query data layer installed in `app/providers.tsx`; when server data already exists for the current render, seed the matching client query from that server result instead of immediately refetching on mount.
- Auth-scoped React Query entries (for example linked accounts, signer status, wallet-owned profile data) must key off the active identity and remove the previous identity's entries on logout, wallet switch, or other auth-boundary transitions.

## Auth + Wallet Constraints

- One wallet maps to one identity at a time.
- Wallet mismatch should force re-auth (`WalletIdentityGuard`).
- Avoid exposing linked-wallet lists from session payloads as active identity state.

## Onchain Flow Constraints

- Onchain writes should route through shared transaction execution hooks.
- Use shared quote/validation helpers before contract writes.
- Keep chain switching and transaction lifecycle UX consistent.

## API Route Constraints (`app/api/**`)

- Validate and normalize user input at route boundaries.
- Return stable response envelopes with explicit status behavior.
- Avoid leaking raw third-party errors directly to clients.

## Required Updates

When changing boundary-sensitive frontend code, update matching docs:

- module boundaries: `agent-docs/references/module-boundary-map.md`
- route/data flow: `agent-docs/references/app-router-and-data-flow.md`
- auth/wallet: `agent-docs/references/auth-wallet-model.md`
- server/cache: `agent-docs/references/server-data-cache-map.md`
- onchain: `agent-docs/references/onchain-execution-map.md`

## Verification Baseline

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter web build:ci` for build-sensitive changes.
