# 2026-03-01 Buildbot Recovery Merge

## Goal

Restore the buildbot wallet/exec/docs/tools server paths and related support files that were lost after the `main` reset, then validate against current `main` and commit a clean recovery.

## Scope

- Recover file set from last known buildbot-containing commit: `fb1cfd4`.
- Apply only files that diverged in the reset window (`fb1cfd4..40ddfbe`).
- Run required verification gates before commit.

## Constraints

- Preserve current branch (`main`) and integrate recovery as a normal commit.
- Do not rewrite history.
- Keep recovery auditable with explicit source commit.

## Plan

1. Materialize reset-window file list and restore those paths from `fb1cfd4`.
2. Verify with `pnpm typecheck`, `pnpm test`, and `pnpm --filter web build:ci`.
3. Inspect resulting diff for unintended changes/secrets.
4. Commit recovered paths with a single scoped recovery commit.

## Success Criteria

- Buildbot routes/libraries/tests are present again in working tree.
- Required checks pass on current `main` with recovery applied.
- Commit contains only intended recovery paths.
