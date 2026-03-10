# 2026-03-10 CLI Audit Remediation

## Goal

Close the hosted CLI execution and app-surface findings from the 2026-03-10 audit by making bearer auth live-session-aware, adding resumable idempotent user-op state, enforcing explicit wait/body/policy limits, collapsing wallet provisioning into one post-policy layer, and hardening public goal-create and swap permit flows.

## Scope

- `apps/web/app/api/cli/exec/**`
- `apps/web/lib/server/cli/**`
- `apps/web/prisma/cobuild.prisma`
- `apps/web/prisma/sql/**`
- `apps/web/app/(app)/goals/create/**`
- `apps/web/app/(app)/actions/swaps-direct-intent.ts`
- `apps/web/lib/server/swaps-direct-intent.ts`
- `apps/web/app/(app)/actions/usdc-permit.ts`
- `apps/web/lib/server/usdc-permit.ts`
- Matching tests and auth/onchain execution docs

## Risks and Guards

- Hosted exec retries must become replay-safe and resumable rather than permanently stuck.
- Policy validation must happen before any expensive wallet provisioning or CDP work.
- Pending user operations must surface a stable machine-readable response the CLI can resume safely.
- Goal-create defaults must not ship fake or test-only protocol values.
- Direct-intent and sponsored permit actions must prove caller ownership before spending sponsor resources.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

## Status

Completed.
