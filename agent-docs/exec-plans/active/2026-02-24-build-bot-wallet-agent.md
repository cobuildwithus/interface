# Build-bot CLI + CDP server wallet integration (Privy identity)

Status: active
Created: 2026-02-24
Updated: 2026-02-24

## Goal

- Add a sibling CLI package `../build-bot` that calls the interface app over HTTP.
- Add server-side `build-bot` API routes in `apps/web` that map Privy wallet identity to one CDP server wallet account per `(ownerAddress, agentKey)`.
- Support PAT-authenticated wallet provisioning and execution (`transfer` + allowlisted `tx`) without exposing CDP secrets to clients.

## Success criteria

- New API routes exist:
- `POST/GET/DELETE /api/build-bot/token` (session-authenticated PAT management)
- `POST /api/build-bot/wallet` (Bearer PAT, get/create wallet)
- `POST /api/build-bot/exec` (Bearer PAT, `transfer` or `tx`)
- Wallet creation is automatic on first wallet/exec use and keyed by `(ownerAddress, agentKey)`, where PAT auth provides `agentKey` (default `"default"` for MVP).
- `POST /api/build-bot/exec` supports idempotency keys (`Idempotency-Key` header or body field) with DB-backed replay lookup.
- Strict policy mode (`BUILD_BOT_STRICT=1`) can fail closed when required allowlists/caps are missing.
- Optional CDP account policy attachment is supported via `BUILD_BOT_ACCOUNT_POLICY_ID`.
- New sibling package `../build-bot` runs CLI commands for config, wallet fetch, transfer, and tx.
- Required verification passes for this repo (`pnpm typecheck`, `pnpm test`, `pnpm --filter web build:ci`) plus completion workflow checks.

## Scope

- In scope:
- Prisma schema additions for build-bot token/wallet/log records.
- Server modules for token hashing/auth, CDP client, wallet provisioning, policy gates, explorer links.
- API routes for PAT management and execution.
- Sibling CLI package creation and wiring.
- Doc updates for architecture/auth/data-route references.
- Out of scope:
- Frontend UI for token management.
- OAuth/device code login flow.
- Multi-agent runtime support beyond schema readiness.

## Constraints

- Keep one-wallet = one-identity invariant by keying ownership to normalized session wallet address.
- Do not use daemon/electron architecture.
- Keep CDP secrets server-only.
- Keep API naming `build-bot` (not `broker`) for clarity.

## Risks and mitigations

1. Risk: DB schema deploy lag can break runtime routes.
   Mitigation: keep schema explicit, generate client, and document tables/required deploy step in handoff.
2. Risk: overly broad tx execution surface.
   Mitigation: require allowlist/caps via env policy checks, default-deny generic tx when contracts allowlist is unset.
3. Risk: token leakage or replay.
   Mitigation: store only token hashes, use revocation and last-used timestamps, and enforce idempotency key replay guards in tx logs.

## Tasks

1. Add schema models and generate Prisma client.
2. Implement `apps/web/lib/server/build-bot/*` modules.
3. Add `apps/web/app/api/build-bot/*` routes.
4. Add tests for auth/policy/route behavior.
5. Create sibling CLI package `../build-bot` with command wiring.
6. Update docs and run required verification + completion workflow checks.
7. Harden PAT scoping, idempotency behavior, strict policy mode, and CDP account policy wiring.

## Decisions

- API namespace: `build-bot`.
- PAT model: session-minted, hashed-at-rest bearer tokens.
- MVP agent key remains `default`; PAT auth context carries `agentKey`, and wallet/exec request bodies no longer accept `agentKey`.

## Verification

- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter web build:ci`
- `bash scripts/check-agent-docs-drift.sh`
- `bash scripts/doc-gardening.sh --fail-on-issues`
