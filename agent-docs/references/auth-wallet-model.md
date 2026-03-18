# Auth and Wallet Model

## Server Session Model

- Session source is Privy token cookie parsing in `lib/domains/auth/session.ts`.
- `getSession()` projects wallet + linked account identity (Farcaster/Twitter when available) and is request-scoped via React `cache()` so repeated reads within one server render dedupe safely.
- App shell converts session into UI-safe user response in `lib/server/user-response.ts`.

## Key Files

- `apps/web/lib/domains/auth/session.ts`
- `apps/web/lib/domains/auth/use-login.ts`
- `apps/web/lib/domains/auth/use-auth-click.ts`
- `apps/web/components/ui/auth-button.tsx`
- `apps/web/components/features/auth/wallet-identity-guard.tsx`
- `apps/web/app/api/linked-accounts/route.ts`

## Client Auth Model

- Privy login/connect/logout orchestration: `lib/domains/auth/use-login.ts`.
- Click gate for auth-required buttons: `lib/domains/auth/use-auth-click.ts`.
- Auth-required button primitive: `components/ui/auth-button.tsx`.
- `AuthButton` infers trigger/open surfaces from repo UI primitive trigger props and honors the server-projected session during the client hydration window so a session-authenticated user does not lose the first click before Privy/Wagmi finish hydrating on the client.

## Wallet Identity Invariant

- Active session wallet should match connected wallet.
- `components/features/auth/wallet-identity-guard.tsx` enforces mismatch logout/re-auth.
- Do not build multi-wallet active-session flows.

## Failure Modes and Handling

1. Session wallet missing or invalid:

- Treat user as unauthenticated and require login.

2. Multiple linked wallets in the auth token:

- Reject the session as unauthenticated (fail closed; multi-wallet sessions are unsupported).

3. Connected wallet changes mid-session:

- Trigger logout/re-auth via `WalletIdentityGuard`.

4. Auth-required action bypasses auth guard:

- Route all user-triggered privileged actions through `AuthButton` and auth-click hooks.
- Hydration fallback applies automatically to trigger/open surfaces when the server session exists but client auth hooks are still resolving; non-trigger actions stay blocked until the client auth state settles, and actual action handlers must still enforce wallet/session readiness before writes.

## Linked Accounts

- Linked account state types/parsing: `lib/domains/auth/linked-accounts/**`.
- API surface for linked accounts: `app/api/linked-accounts/route.ts`.
- Server components that need a normalized Farcaster/Twitter view should use the linked-account server-view helpers instead of re-parsing `platformId` at each consumer.
- Client linked-account and signer hooks are seeded from server-fetched settings/profile data where available and refresh via React Query after mutations instead of relying on broad `router.refresh()` calls.
- Client social-account state carries an explicit `linked` / `session` / `detected` source so detected fallback identities do not masquerade as user-linked accounts in auth UI.
- Auth-scoped client queries for linked accounts, signer status, and wallet-owned profile data are removed when the active identity changes so session-owned state does not leak across logout or wallet-switch boundaries.

## CLI Token Model

- CLI API PAT mint/revoke is session-authenticated (`app/api/cli/token/route.ts`).
- CLI bearer auth resolves to `{ ownerAddress, agentKey }`; wallet/exec routes derive `agentKey` from PAT auth context rather than request bodies.
- Hosted CLI bearer verification uses the shared `@cobuild/wire` verifier, but keeps JWT key loading and active-session DB reads local to `interface`.
- Active CLI sessions must still exist, remain unrevoked/unexpired, and keep the same stored scope as the presented bearer token.
- Wallet provisioning is keyed by `(ownerAddress, agentKey)` and currently defaults PAT `agentKey` to `"default"` for MVP.
- CLI CLI docs/tools routes use canonical chat-api `/v1/tools*` and `/v1/tool-executions` surfaces through edge/gateway routing.
- Interface keeps PAT mint/revoke and cli wallet/exec APIs in-repo (`app/api/cli/**`) while chat-api owns canonical tool-runtime execution.

## Risk Points

1. Wallet mismatch edge cases after reconnect/switch flows.
2. Inconsistent auth gating if actions bypass `AuthButton`.
3. Session parsing or linked-account mapping drift when auth provider behavior changes.

## Update Rule

If auth hooks, session parsing, or wallet-identity enforcement changes, update this file and `agent-docs/SECURITY.md`.
