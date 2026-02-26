# Testing and CI Map

## Local Verification Baseline

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
- Doc maintenance: `.github/workflows/doc-gardening.yml`

## Doc Enforcement Scripts

- Drift checks: `scripts/check-agent-docs-drift.sh`
- Gardening/index validation: `scripts/doc-gardening.sh`

## Architecture Enforcement Posture

- Architecture/doc drift is enforced by CI script checks.
- Generated doc artifacts are enforced in CI (`doc-inventory` and `doc-gardening-report` must be committed).
- Code quality is enforced by lint/typecheck/tests/build checks.
- Coverage artifacts are uploaded for analysis.

## Update Rule

If verification commands, workflows, or enforcement scripts change, update this file and `agent-docs/QUALITY_SCORE.md`.
