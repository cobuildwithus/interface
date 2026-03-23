# AGENTS.md

## Purpose

This file is the routing map for agent work in this repository.
Detailed guidance lives in `agent-docs/`.

## Precedence

1. Explicit user instruction in the current chat turn.
2. `Hard Rules (Non-Negotiable)` in this file.
3. Other sections in this file.
4. Detailed process docs under `agent-docs/**`.

If instructions still conflict after applying this order, ask the user before acting.

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
- Never introduce `any` or lazy type bypasses (for example `unknown as T`); use concrete types or runtime validation.
- Use a hard cutover approach and never implement backward compatibility unless explicitly asked.
- Never commit or hand off a local-link `@cobuild/wire` spec; `pnpm wire:ensure-published` must leave both `apps/web` and `apps/contracts` on published versions before commit.
- Historical plan docs under `agent-docs/exec-plans/completed/` are immutable snapshots.
- COORDINATION_LEDGER hard gate for every coding task (single-agent and multi-agent): before any code change, add or update your active entry in `agent-docs/exec-plans/active/COORDINATION_LEDGER.md` with scope and planned symbol add/rename/delete work; do not edit code, generate code, or apply patches until that entry exists; if you cannot update the ledger first, stop and escalate; keep the entry current as scope changes, and remove your entry when done.
- Ledger rows are active-work notices by default, not hard file locks. Read overlapping rows first, preserve adjacent edits, and coordinate through scope/symbol notes. Treat a row as exclusive only when it explicitly says overlap is unsafe, the lane is a large refactor, or the user gives a conflicting direction.
- Any spawned subagent that may review or edit code must read `COORDINATION_LEDGER.md`, follow the same hard gate before making code changes, and honor any explicit exclusive/refactor notes on overlapping rows.
- Never lower enforced coverage thresholds in CI/test config without explicit user approval in the current chat.
- For UI-affecting work under `apps/web/**`, do not rely on static reasoning alone; inspect the rendered result in a browser at desktop and mobile sizes before handoff.
- Run completion workflow audit passes (`simplify`, `test-coverage-audit`, `task-finish-review`) for every non-doc change that touches production code or tests; skip only when the user explicitly says to skip for that turn.
- Docs/process-only changes skip completion workflow audit passes unless the user explicitly asks to run them.
- Keep this file short and route-oriented; keep durable detail in `agent-docs/`.

## How To Work

- Before starting implementation, run a quick assumptions check: if any high-impact assumption is unclear (scope, security, invariants, external dependencies, or deployment behavior), ask the user to clarify first.
- Do not block on low-impact assumptions; proceed with best judgment and call out those assumptions in handoff notes.
- Continue working in the current tree even when unrelated external dirty changes appear.
- Do not pause or block progress solely because the worktree is dirty; treat out-of-scope changes as context unless they conflict with a listed hard rule.
- If unexpected commits or unrelated file changes appear mid-task, continue from current `HEAD` by default and only pause when a listed hard rule is at risk or the user asks you to stop.
- Never revert, delete, or rewrite existing edits you did not make unless the user explicitly asks; dirty context is not cleanup work.
- If you generate temporary files for testing/exploration (for example scratch outputs or local metadata), remove them before handoff unless the user asked to keep them.
- If unrelated breakage appears in files you did not touch, keep working on your scoped changes; only take ownership of fixing it when your edits caused it or the user explicitly asks.
- Do not introduce "break compile now, fix later" phases during shared work.
- For coding tasks, follow the COORDINATION_LEDGER hard rule above (including required row fields and lifecycle updates).
- Prefer narrow ledger rows and symbol claims. If you need temporary exclusive control of a file or symbol cluster, say so explicitly in the row notes and explain why overlap is unsafe.
- When a change can affect compilation (shared types, signatures, interfaces, schema/import boundaries), update all impacted call sites in the same change set so the tree stays compiling.
- When architecture-significant code changes, update matching `agent-docs/*` entries.
- For multi-file or high-risk work, add an execution plan in `agent-docs/exec-plans/active/`.

## Browser / Web Debugging

- To inspect live browser state (snapshots, DOM, console, network, performance, screenshots), use the `chrome-devtools` CLI.
- Always run `chrome-devtools --help` first to confirm exact command names and flags for this version.
- Prefer `chrome-devtools take-snapshot` first, describe observed state, then make changes.
- Never assume current page state; snapshot before actions.
- For UI-affecting changes, inspect at least one desktop-width and one mobile-width state, then verify no obvious overflow, overlap, clipped CTA, or broken hierarchy before handoff.

### Commit and Handoff

- Same-turn task completion = acceptance, unless the user explicitly says `review first` or `do not commit`.
- If you changed files, run the required checks defined below before handoff. If they pass, you MUST run `scripts/committer "type(scope): summary" path/to/file1 path/to/file2` before sending final handoff.
- If a required check fails for a credibly unrelated pre-existing reason, do not leave your scoped work uncommitted solely because the repo is red. Commit your exact touched files after recording the failing command, the failing target, and why your diff did not cause it. If you cannot defend that causal separation, treat the failure as blocking.
- Do not end with "ready to commit" or "commit pending"; perform the commit in the same turn.
- Use `scripts/committer` only (no manual `git commit`).
- Agent-authored commit messages should use Conventional Commits (`feat|fix|refactor|build|ci|chore|docs|style|perf|test`).
- If no files changed in the current turn, do not create a commit.
- Commit only exact file paths touched in the current turn.
- `scripts/committer` commits full-file diffs for each listed path (not hunk-level).
- Do not skip commit just because the tree is already dirty.
- If a touched file already had edits, still commit and explicitly note that in handoff.
- On commit failure, report the exact error and retry with the appropriate fix (`--force` for stale lock, rerun after branch moved, fix Conventional Commit message, etc.).

### Required Checks

- Before handoff, always run `pnpm wire:ensure-published`.
- Before handoff, always run `pnpm typecheck`, `pnpm lint`, and `pnpm test`.
- For any non-doc change that touches production code or tests, also run `pnpm test:coverage`.
- If this turn touched runtime-sensitive app paths (`apps/web/**`, `apps/contracts/**`, `.github/workflows/**`, `package.json`, `pnpm-workspace.yaml`), also run `pnpm --filter web build:ci`.
- For docs/process-only turns, additionally run `bash scripts/check-agent-docs-drift.sh` and `bash scripts/doc-gardening.sh --fail-on-issues`.

## Completion Workflow

- For any non-doc change that touches production code or tests, run this full workflow before final handoff.
- Skip this workflow for docs/process-only turns unless the user explicitly asks for the full audit sequence.
- For changes that require this workflow: run a simplification pass using `agent-docs/prompts/simplify.md`.
- Apply behavior-preserving simplifications identified in that pass.
- For UI-affecting changes under `apps/web/**`, run a frontend quality review using `agent-docs/prompts/frontend-quality-review.md` after the simplification pass and resolve obvious user-facing issues before the remaining audits.
- Then run a test-coverage audit pass using `agent-docs/prompts/test-coverage-audit.md` with full change context.
- The test-coverage audit subagent should implement the highest-impact missing tests it identifies (especially edge cases, failure modes, and invariants) before handoff.
- Re-run required checks after the simplify + test-coverage sequence (even if no new tests were added).
- Then run a completion audit using `agent-docs/prompts/task-finish-review.md` with full change context.
- Final handoff must report required-check results; green required checks remain the default completion bar.
- If a required check fails for a credibly unrelated pre-existing reason, commit your exact touched files and hand off with the failing command, failing target, and why your diff did not cause it. If you cannot defend that separation, treat the failure as blocking.
- Do not skip these audit passes unless the user explicitly instructs skipping them for that turn.
- Do not rush or interrupt these subagent passes: wait for each `simplify`, `test-coverage-audit`, and `task-finish-review` pass to return, review the result, and resolve or explicitly hand off any follow-up before final handoff.
- When using a fresh subagent for coverage or completion audits, provide an audit handoff packet that includes:
- what changed and why (detailed behavior-level summary, not just filenames)
- expected invariants/assumptions that must still hold
- links to active execution-plan docs under `agent-docs/exec-plans/active/` (when present)
- verification evidence already run (commands + pass/fail outcomes)
- current git worktree context (relevant modified files, known unrelated dirty paths, and review scope boundaries)
- explicit instruction to read `agent-docs/exec-plans/active/COORDINATION_LEDGER.md`, honor any explicit exclusive/refactor notes, and otherwise work carefully on top of overlapping rows
- Instruct the reviewer to use the handoff packet plus current `git diff`/call-path inspection; do not rely on diff-only inference.
- During simplify/test-coverage/completion-audit passes, never overwrite, discard, or revert existing worktree edits (including unrelated dirty files) and never use reset/checkout-style cleanup commands.
- If a suggested audit change collides with pre-existing edits, leave the file untouched and escalate in handoff notes.
- Always prefer a fresh subagent for coverage and completion audits; only fall back to same-agent audit when subagent execution is unavailable.
- Resolve all high-severity findings before final handoff; if anything is deferred, document risk, rationale, and follow-up owner.

## CPU/Runtime Guardrails

- Timings are not benchmarked yet for this repo; treat commands below as potentially expensive on shared machines:
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`
- During multi-agent or shared-machine sessions, avoid running these heavy commands concurrently.
- Prefer scoped iteration checks while developing, then run the full required gate once before handoff.
- When benchmark data is captured, update this section with measured timing guidance.

## Notes

- `agent-docs/index.md` is the canonical map. Keep it updated when docs move or change.
