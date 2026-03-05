# 2026-02-25 CLI Endpoint Cutover

## Goal

Hard-cut the interface API namespace from `/api/CLI/*` to `/api/cli/*` so the interface matches the updated CLI endpoint contract.

## Scope

- Rename Next.js API route directory `apps/web/app/api/CLI` to `apps/web/app/api/cli`.
- Update endpoint literals in setup dialog + callback parser.
- Update all affected API and setup tests that assert endpoint URLs.
- Update architecture/reference docs that explicitly list CLI route paths.

## Constraints

- No backward compatibility alias routes unless explicitly requested.
- Keep server module boundaries and auth/policy behavior unchanged.
- Do not touch unrelated active script/preset work owned by another ledger entry.

## Work Breakdown

1. Apply namespace rename in route paths and endpoint literals.
2. Update tests to assert `/api/cli/*` URLs and callback prefixes.
3. Update docs that map API route topology and auth/onchain references.
4. Run required checks and completion workflow audits.
5. Commit scoped files via `scripts/committer`.

## Success Criteria

- Runtime code no longer uses `/api/CLI/*`.
- Tests pass with `/api/cli/*` contracts.
- Docs that enumerate these endpoints reflect the new namespace.
  Status: completed
  Updated: 2026-02-25
  Completed: 2026-02-25
