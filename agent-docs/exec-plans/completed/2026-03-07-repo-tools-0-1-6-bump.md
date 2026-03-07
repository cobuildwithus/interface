# Repo Tools 0.1.6 Bump

Status: completed
Created: 2026-03-07
Updated: 2026-03-07

## Goal

- Finish the repo-tools consumer cutover in `interface` using the published `@cobuild/repo-tools@0.1.6` package.

## Success criteria

- Shared repo-tools wrapper scripts stay in place.
- `package.json` and `pnpm-lock.yaml` reference `@cobuild/repo-tools@^0.1.6`.
- Required checks pass.

## Scope

- In scope: repo-tools wrapper scripts/config, package metadata/lockfile, execution-plan docs.
- Out of scope: app feature behavior unrelated to shared repo tooling.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm --filter web build:ci`
- `bash scripts/check-agent-docs-drift.sh`
- `bash scripts/doc-gardening.sh --fail-on-issues`
  Completed: 2026-03-07
