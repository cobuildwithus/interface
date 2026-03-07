# Repo Tools Version Bump

Status: completed
Created: 2026-03-07
Updated: 2026-03-07

## Goal

- Bump `@cobuild/repo-tools` to the published version that includes the shared audit/dependency-switch bins.

## Success criteria

- `package.json` and `pnpm-lock.yaml` use the new published repo-tools version.
- Required checks pass.

## Scope

- In scope: package metadata/lockfile and execution-plan docs.
- Out of scope: interface runtime behavior.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `bash scripts/check-agent-docs-drift.sh`
- `bash scripts/doc-gardening.sh --fail-on-issues`
  Completed: 2026-03-07
