# Repo Tools Published Rollout

## Goal

Switch `interface` from the local `file:../repo-tools` dependency to the published `@cobuild/repo-tools@^0.1.4` package without changing runtime behavior.

## Scope

- Update `package.json` devDependency for `@cobuild/repo-tools`.
- Refresh `pnpm-lock.yaml` for the published package resolution only.
- Keep coordination/plan docs in sync for this process-only multi-file change.

## Constraints

- Do not modify application code or tests.
- Do not touch unrelated dirty work from other agents.
- Keep the change limited to dependency source, lockfile, and required plan/ledger artifacts.

## Done

- Reserved ledger ownership for the dependency-source update.
- Updated `package.json` to use `@cobuild/repo-tools@^0.1.4`.
- Refreshed `pnpm-lock.yaml` to the published tarball resolution.
- Completed required verification:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm --filter web build:ci`
  - `bash scripts/check-agent-docs-drift.sh`
  - `bash scripts/doc-gardening.sh --fail-on-issues`

## Now

- Finalize plan archival and commit only touched files.

## Next

- None.
