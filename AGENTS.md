# AGENTS.md

## Purpose

This file is the routing map for agent work in this repository.
Detailed guidance lives in `agent-docs/`.

## Read Order

1. `agent-docs/index.md`
2. `ARCHITECTURE.md`
3. `agent-docs/cobuild-ui-architecture.md`
4. `agent-docs/FRONTEND.md`
5. `agent-docs/RELIABILITY.md`
6. `agent-docs/SECURITY.md`
7. `agent-docs/references/module-boundary-map.md`
8. `agent-docs/references/app-router-and-data-flow.md`
9. `agent-docs/references/auth-wallet-model.md`
10. `agent-docs/references/server-data-cache-map.md`
11. `agent-docs/references/onchain-execution-map.md`
12. `agent-docs/references/testing-ci-map.md`
13. `apps/web/AGENTS.md`
14. `AGENT_NOTES.md` (historical context when needed)

## Hard Rules (Non-Negotiable)

- Never access `.env` or `.env*` files.
- Enforce one wallet = one identity across UI, auth, and server flows.
- Use `AuthButton` for settings and user-triggered account actions.
- Historical plan docs under `agent-docs/exec-plans/completed/` are immutable snapshots.
- Keep this file short and route-oriented; keep durable detail in `agent-docs/`.

## How To Work

- Continue working in the current tree even when unrelated external dirty changes appear.
- Do not pause or block progress solely because the worktree is dirty.
- If unrelated breakage appears in files you did not touch, continue scoped work unless your edits caused it or the user asks you to own it.
- When architecture-significant code changes, update matching `agent-docs/*` entries.
- For multi-file or high-risk work, add an execution plan in `agent-docs/exec-plans/active/`.

### Commit and Handoff

- Complete the requested work in the same turn unless the user explicitly asks for review-only output.
- If the user asks for a commit and required checks are green, run `scripts/committer "type(scope): summary" path/to/file1 path/to/file2`.
- Use `scripts/committer` (not manual `git commit`) so only intended file paths are committed.
- Use Conventional Commit style (`feat|fix|refactor|build|ci|chore|docs|style|perf|test`) for agent-authored commit messages.
- Do not use destructive git commands unless explicitly requested.

### Required Checks

- Before handoff, always run `pnpm typecheck` and `pnpm test`.
- If this turn touched runtime-sensitive app paths (`apps/web/**`, `apps/contracts/**`, `.github/workflows/**`, `package.json`, `pnpm-workspace.yaml`), also run `pnpm --filter web build:ci`.
- For docs/process-only turns, additionally run `bash scripts/check-agent-docs-drift.sh` and `bash scripts/doc-gardening.sh --fail-on-issues`.

## Completion Workflow

- After implementation and required checks pass, run a simplification pass using `agent-docs/prompts/simplify.md`.
- Apply behavior-preserving simplifications identified in that pass.
- Then run a test-coverage audit pass using `agent-docs/prompts/test-coverage-audit.md` with full change context.
- The coverage audit should implement the highest-impact missing tests it identifies before handoff.
- Then run a completion audit pass using `agent-docs/prompts/task-finish-review.md`.
- Re-run required checks after the simplify + coverage sequence.
- For coverage/completion audits, provide a compact handoff packet: what changed, invariants to preserve, commands already run, and scope boundaries.
- Resolve all high-severity findings before final handoff; if anything is deferred, document risk and follow-up owner.

## CPU/Runtime Guardrails

- Timings are not benchmarked yet for this repo; treat commands below as potentially expensive on shared machines:
- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter web build:ci`
- During multi-agent or shared-machine sessions, avoid running these heavy commands concurrently.
- Prefer scoped iteration checks while developing, then run the full required gate once before handoff.
- When benchmark data is captured, update this section with measured timing guidance.

## Notes

- `agent-docs/index.md` is the canonical map. Keep it updated when docs move or change.
