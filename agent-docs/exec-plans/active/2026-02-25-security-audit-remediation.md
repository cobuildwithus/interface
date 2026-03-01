# 2026-02-25 Security Audit Remediation

## Goal

Implement the remaining high/medium-priority security fixes from the audit:

1. Auth-gate privileged server actions (`usdc-permit`, `swaps-direct-intent`)
2. Remove host/header-derived origin trust surfaces (OG + metadata base URL)
3. Add same-origin CSRF checks to image upload API
4. Harden production CSP and reduce SVG upload risk

## Invariants

- One wallet = one identity must remain enforced.
- No backward-compat mode for insecure behavior.
- No `.env` file access.
- All required verification gates must pass before handoff.

## Workstreams

1. `usdc-permit` server action auth + owner binding + tests
2. `swaps-direct-intent` server action auth + tests
3. OG/metadata host trust hardening + tests
4. `/api/images/upload` same-origin checks + tests
5. CSP prod hardening + SVG upload restriction + tests

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

