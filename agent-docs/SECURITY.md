# Security

## Hard Constraints

- Never access `.env` or `.env*` files.
- Treat auth/session and wallet identity flows as high-sensitivity boundaries.
- Validate external inputs at API and server-action boundaries.
- Avoid broad data exposure in logs or client payloads.

## Trust Boundaries

1. Browser -> Next.js app/API routes

- Input validation, auth checks, response shaping.

2. Session/auth boundary

- Privy token cookie parsing and linked-account extraction.
- Wallet identity is normalized and used as primary user identity.

3. Server data boundary

- Prisma + read replicas for database access.
- Vercel KV for selected state and encrypted signer-related storage.

4. Third-party boundary

- Coinbase onramp APIs
- Farcaster/Neynar integrations
- Cloudflare Images upload APIs
- Onchain RPC providers

## Security-Critical Paths

- `app/api/linked-accounts/route.ts`
- `app/api/onramp-status/route.ts`
- `app/api/images/upload/route.ts`
- `app/api/cast/[hash]/view/route.ts`
- `lib/domains/auth/session.ts`
- `lib/server/kv/encryption.ts`
- `chat-api` `/v1/tools*` and `/v1/tool-executions` routes (outside this repo; reached via edge/gateway routing)

## Defensive Rules

- Keep unauthorized resource access responses minimal and consistent.
- Avoid logging secrets or raw auth headers.
- Keep signed-token checks and same-origin constraints for sensitive counters/views.
- Keep encrypted storage keys validated and size-checked.
- Reject ambiguous auth identities (for example, sessions with multiple linked wallets).
- Only use `AuthButton` pending-session allowances for non-privileged trigger/open flows during client hydration; wallet-connected writes must still enforce real client readiness.
- In production, require immutable Git refs for runtime-fetched external prompt content.

## Current Watchlist

1. Header redaction/logging discipline across new route handlers.
2. Third-party error normalization consistency.
3. Replica consistency assumptions on paths that read immediately after writes.

## Escalation

Escalate to humans for:

- legal/compliance-sensitive copy,
- auth model changes,
- permission model or treasury-transfer changes,
- new third-party trust boundaries.
