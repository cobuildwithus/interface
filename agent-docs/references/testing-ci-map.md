# Testing and CI Map

## Local Verification Baseline

- `pnpm wire:ensure-published`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter web build:ci` for compile-sensitive paths
- `bash scripts/check-agent-docs-drift.sh` for docs/process coupling
- `bash scripts/doc-gardening.sh --fail-on-issues` for docs freshness

## Workflow Coverage

- Main CI: `.github/workflows/test.yml`
- Coverage artifact run: `.github/workflows/coverage.yml`
- Security scan: `.github/workflows/codeql.yml`
- Local commit guard: `.husky/pre-commit`

## Doc Enforcement Scripts

- Drift checks: `scripts/check-agent-docs-drift.sh`
- Drift checks ignore execution-plan-only churn when deciding whether `agent-docs/index.md` must change.
- `agent-docs/exec-plans/active/COORDINATION_LEDGER.md` alone does not count as an active execution plan for docs-drift relief.
- Dependency-only `package.json` + optional `pnpm-lock.yaml` updates do not require matching docs updates.
- Gardening/index validation: `scripts/doc-gardening.sh`
- Published dependency guard: `scripts/wire-ensure-published.sh` (must reject committed local-link `@cobuild/wire` specs in both `apps/web/package.json` and `apps/contracts/package.json`)
- Local pre-commit runs `pnpm wire:ensure-published` before staging repo manifests so `link:../wire` cannot be committed from the interface workspace packages.
- Local pre-commit runs doc gardening only when docs/governance files are staged.

## Architecture Enforcement Posture

- Architecture/doc drift is enforced by CI script checks.
- Generated doc artifacts are auto-generated and staged in local pre-commit hooks only for docs/governance changes.
- CI runs doc-gardening validation but does not fail on generated-doc diff-only drift.
- Code quality is enforced by published-wire/lint/typecheck/tests/build checks.
- Coverage artifacts are uploaded for analysis.

## Update Rule

If verification commands, workflows, or enforcement scripts change, update this file and `agent-docs/QUALITY_SCORE.md`.
