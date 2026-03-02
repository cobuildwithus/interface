# 2026-02-25 Buildbot Endpoint Cutover

## Goal

Hard-cut the interface API namespace from `/api/build-bot/*` to `/api/buildbot/*` so the interface matches the updated CLI endpoint contract.

## Scope

- Rename Next.js API route directory `apps/web/app/api/build-bot` to `apps/web/app/api/buildbot`.
- Update endpoint literals in setup dialog + callback parser.
- Update all affected API and setup tests that assert endpoint URLs.
- Update architecture/reference docs that explicitly list build-bot route paths.

## Constraints

- No backward compatibility alias routes unless explicitly requested.
- Keep server module boundaries and auth/policy behavior unchanged.
- Do not touch unrelated active script/preset work owned by another ledger entry.

## Work Breakdown

1. Apply namespace rename in route paths and endpoint literals.
2. Update tests to assert `/api/buildbot/*` URLs and callback prefixes.
3. Update docs that map API route topology and auth/onchain references.
4. Run required checks and completion workflow audits.
5. Commit scoped files via `scripts/committer`.

## Success Criteria

- Runtime code no longer uses `/api/build-bot/*`.
- Tests pass with `/api/buildbot/*` contracts.
- Docs that enumerate these endpoints reflect the new namespace.
  Status: completed
  Updated: 2026-02-25
  Completed: 2026-02-25
