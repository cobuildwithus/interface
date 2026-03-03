# App Router and Data Flow

## Router Structure

- Authenticated app shell: `apps/web/app/(app)/**`
- Marketing/token flows: `apps/web/app/(marketing)/**`
- API handlers: `apps/web/app/api/**`

## Provider and Session Bootstrapping

1. Root layout applies fonts/theme/toasts (`app/layout.tsx`).
2. `AppProviders` hydrates wagmi state from cookies (`app/app-providers.tsx`).
3. `Providers` creates Privy/Wagmi/React Query context (`app/providers.tsx`).
4. `(app)` layout resolves server session/profile and injects user context (`app/(app)/layout.tsx`).

## Key Files

- `apps/web/app/layout.tsx`
- `apps/web/app/app-providers.tsx`
- `apps/web/app/providers.tsx`
- `apps/web/app/(app)/layout.tsx`
- `apps/web/app/api/**/route.ts`

## Typical Page Data Flow

1. Route component requests domain/server data.
2. Domain modules in `lib/domains/**` normalize/shape data.
3. Server utilities in `lib/server/**` execute DB/KV/external side effects.
4. UI components render via `components/features/**` and `components/ui/**`.

## API Route Boundary Map

Representative route responsibilities:

- linked accounts state: `app/api/linked-accounts/route.ts`
- profile lookup: `app/api/profile/route.ts`
- onchain revnet data: `app/api/revnet/route.ts`
- cast view anti-abuse + counters: `app/api/cast/[hash]/view/route.ts`
- image uploads: `app/api/images/upload/route.ts`
- cli PAT + wallet execution surface: `app/api/cli/{token,wallet,exec}/route.ts`
- cli canonical tools runtime (`/v1/tools*`, `/v1/tool-executions`) is served by chat-api and routed at the edge/gateway (no Next.js handlers in this repo)

## Critical Invariants

1. Authenticated route groups rely on server-projected session state, not client-only wallet state.
2. API routes are validation and normalization boundaries; request payloads are never trusted raw.
3. Route files compose domain and UI behavior; persistence/integration side effects belong in domain/server layers.
4. Wallet identity consistency between connected wallet and session wallet is enforced before privileged actions.

## Update Rule

If route topology or major data-flow boundaries change, update this file with the same PR.
