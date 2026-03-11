# 2026-03-10 Shared CLI Bearer Verifier

Status: completed
Created: 2026-03-10
Updated: 2026-03-10
Completed: 2026-03-10

## Goal

Move hosted CLI bearer auth in `interface` onto the shared `wire` verifier while keeping repo-local key loading and DB-backed session liveness checks.

## Success Criteria

- `apps/web/lib/server/cli/auth.ts` delegates bearer parsing, JWT/principal validation, active-session scope matching, and required-scope checks to `wire`.
- Repo-local DB lookup remains in `interface`.
- Hosted CLI auth behavior matches `chat-api`, including fail-closed scope mismatch handling.

## Scope

- `apps/web/lib/server/cli/auth.ts`
- `apps/web/lib/server/cli/auth.test.ts`
- auth docs if invariants need clarification

## Out Of Scope

- Privy cookie session parsing in `lib/domains/auth/session.ts`
- Hosted CLI route contract changes
- Wallet provisioning or execution behavior changes

## Risks / Constraints

- Preserve one-wallet-one-identity behavior.
- Keep auth failures mapped to current `CliAuthError` statuses.
- Do not add DB-bound code to `wire`.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

## Current Status

Completed.
