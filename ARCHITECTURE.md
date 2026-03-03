# Interface Architecture

Last updated: 2026-02-23

See `README.md` for setup/contributor context. Canonical docs map: `agent-docs/index.md`.

## Repository Layout

```text
interface/
├── apps/
│   ├── web/        # Next.js App Router app + API routes
│   └── contracts/  # ABI/address generation synced into web
├── agent-docs/     # Durable architecture, product, reliability docs
├── scripts/        # Agent-doc drift/gardening + exec-plan lifecycle
└── .github/workflows/
```

## Runtime Composition

### Root runtime

- `apps/web/app/layout.tsx`: root HTML/body, fonts, theme, toaster, analytics.
- `apps/web/app/app-providers.tsx`: server-side cookie hydration for wagmi initial state.
- `apps/web/app/providers.tsx`: Privy + Wagmi + React Query provider stack.

### App shell runtime

- `apps/web/app/(app)/layout.tsx`: authenticated app shell.
- Server-side session/profile load via `getSession` and `getProfile`.
- User session projected into UI with `UserProvider`.
- `WalletIdentityGuard` enforces one-wallet-per-session invariant on the client.

## Route Topology

### Primary App Router groups

- `apps/web/app/(app)/**`: authenticated application flows.
- `apps/web/app/(marketing)/**`: marketing/token landing flows.
- `apps/web/app/api/**`: server route handlers.

### API route boundary

Representative handlers:

- `apps/web/app/api/linked-accounts/route.ts`
- `apps/web/app/api/profile/route.ts`
- `apps/web/app/api/revnet/route.ts`
- `apps/web/app/api/cast/[hash]/view/route.ts`
- `apps/web/app/api/images/upload/route.ts`
- `apps/web/app/api/buildbot/{token,wallet,exec,farcaster/signup}/route.ts`

Build-bot note:

- Canonical tools runtime paths (`/v1/tools*`, `/v1/tool-executions`) are owned by chat-api.
- Interface no longer serves Next.js handlers for these paths; edge/gateway routing forwards `/v1/*` directly to chat-api.

## Layering Model

- Route + page composition: `apps/web/app/**`
- Reusable UI primitives: `apps/web/components/ui/**`
- Feature UI: `apps/web/components/features/**`
- Domain logic: `apps/web/lib/domains/**`
- External integrations: `apps/web/lib/integrations/**`
- Server-only infra/actions: `apps/web/lib/server/**`
- Shared pure helpers: `apps/web/lib/shared/**`
- Boundary ownership + dependency direction: `agent-docs/references/module-boundary-map.md`

## Critical Architecture Invariants

1. Wallet identity invariant

- Session wallet and connected wallet must match for privileged actions.
- Auth-gated actions flow through `AuthButton` + auth hooks.

2. Onchain write invariant

- Writes should route through shared transaction execution helpers (`useContractTransaction`) for chain switching, error normalization, and transaction lifecycle handling.

3. Data consistency invariant

- Prisma read-replica extension is default for non-transactional reads.
- Consistency-sensitive reads should use primary-safe paths.

4. Server boundary invariant

- Server-only modules stay under `lib/server/**`.
- External payload boundaries are validated in API routes and domain parsing helpers.

## Core Flow Maps

### Auth + wallet flow

1. Session derived from Privy token cookie (`lib/domains/auth/session.ts`).
2. App shell injects user context (`app/(app)/layout.tsx`).
3. Client auth interactions use `useLogin` and `useAuthClick`.
4. Wallet mismatch triggers re-auth via `WalletIdentityGuard`.

### Onchain execution flow

1. UI triggers funding/swap actions (`components/features/funding/*`).
2. `useSwapCore` computes quote/constraints.
3. `useRevnetPay` prepares transaction payload.
4. `useContractTransaction` ensures wallet/chain readiness and writes contract call.

### Server data + cache flow

1. DB access through Prisma wrapper (`lib/server/db/cobuild-db-client.ts`).
2. Cache surfaces include `unstable_cache` and Vercel KV state stores.
3. KV-sensitive values can be encrypted (`lib/server/kv/encryption.ts`).

## Contracts Sync Model

- Contract ABIs/addresses are generated in `apps/contracts`.
- Generated artifacts are synced into web onchain domain modules.
- Web app treats synced ABI/address files as generated artifacts.

## Documentation Map

- UI architecture: `agent-docs/cobuild-ui-architecture.md`
- Component inventory: `agent-docs/cobuild-ui-components.md`
- Domain/lib map: `agent-docs/libs-utilities-map.md`
- Data model map: `agent-docs/data-model-map.md`
- Onchain map: `agent-docs/onchain-abis-and-writes.md`
- Module boundary map: `agent-docs/references/module-boundary-map.md`
- Runtime references: `agent-docs/references/*.md`

## Verification Baseline

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter web build:ci`
- `bash scripts/check-agent-docs-drift.sh`
