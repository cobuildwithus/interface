# 2026-03-02 - Interface `/v1` Proxy Removal Hard Cutover

## Goal

Remove Interface-owned `/v1/tools*` and `/v1/tool-executions` proxy route handlers and proxy helper implementation so Interface no longer processes canonical tool-runtime traffic.

## Scope

- Delete Next route handlers under `apps/web/app/v1/{tools,tool-executions}`.
- Delete `apps/web/lib/server/CLI/tools-proxy.ts`.
- Delete proxy-route tests for the removed handlers.
- Update architecture/security/router docs to remove stale ownership claims.

## Constraints

- Hard cutover only; do not add compatibility shims.
- Assume `/v1/*` routing to chat-api is handled by external edge/gateway config.
- Keep changes scoped away from other active ledger entries where possible.

## Work Breakdown

1. Remove route handlers and proxy helper.
2. Remove route test files bound to deleted handlers.
3. Update docs that list removed interface `/v1` routes as active server paths.
4. Run required checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:coverage`, `pnpm --filter web build:ci`.
5. Run completion workflow audits (`simplify`, `test-coverage-audit`, `task-finish-review`) and re-run required checks.
6. Commit scoped files and clear coordination ledger entry.

## Success Criteria

- No `apps/web/app/v1/tools*` or `apps/web/app/v1/tool-executions` route handlers remain.
- No `tools-proxy.ts` implementation remains in interface.
- Required checks pass.
- Docs no longer claim Interface serves those `/v1` routes directly.
  Status: completed
  Updated: 2026-03-12
  Completed: 2026-03-12
