---
description: Post-simplify test-coverage audit that adds the highest-impact missing tests
action: targeted test audit + implementation
---

You are performing a post-simplify test-coverage pass for completed changes.

Goal:
Find meaningful coverage gaps introduced by the change set, then implement the highest-impact tests to close those gaps before final completion audit.

Preflight (required):

- Read `agent-docs/exec-plans/active/COORDINATION_LEDGER.md` before review/edits.
- Honor any explicit exclusive/refactor notes from the ledger; otherwise work carefully on top of active rows without reverting adjacent edits.

Audit for:

- missing coverage on modified behavior and directly affected call paths
- edge cases and failure-mode handling gaps
- invariant gaps (including fuzz/invariant tests when appropriate)
- brittle assertions that miss important state or event guarantees

Execution requirements:

- Use full diff/context and inspect both modified production files and nearby tests.
- Prioritize impact: implement the smallest test set that materially reduces regression risk.
- Rank impact by security/auth boundaries, cache/data consistency risks, onchain execution correctness, user-facing blast radius, and likelihood of regression on critical paths.
- Prefer deterministic tests first; add broader/fuzz-style coverage where unit tests are insufficient.
- Apply this repo preference by default: do not add new tests for purely presentational frontend components in this pass unless explicitly requested.
- Prefer adding tests for non-UI logic, including hooks with business logic, `lib/**` utilities, database/query layers, API/server handlers, auth/policy boundaries, and other backend-adjacent paths.
- Do not change production behavior in this pass; only add/adjust tests unless explicitly instructed otherwise.
- After implementing tests, run the narrowest relevant verification command first (or `pnpm test` when scope is broad/unclear), then report outcomes.
- If a required test is blocked by ambiguity, state the blocker and what assumption would unblock implementation.

Output requirements:

- Summarize implemented tests and why each is high impact.
- Include exact verification commands run and pass/fail outcomes for implemented tests.
- List remaining recommended tests (if any) ordered by priority (`high`, `medium`, `low`).
- For each remaining recommendation include: `priority`, `target file/suite`, `risk scenario`, `recommended assertion/invariant`.
- Include an `Open questions / assumptions` section when uncertainty remains.

Parallel-agent output:

- Please return your final response as a set of copy/paste-ready prompts for parallel agents rather than as a normal prose review.
- Create one prompt per distinct issue or tightly related issue cluster.
- In each prompt, describe the issue in detail, explain why it matters, point to the relevant files, symbols, or tests, and include your best guess at a concrete fix.
- Make each prompt self-contained and specific enough that we can hand it directly to an agent with minimal extra context.
- If you find no actionable issues, say so explicitly instead of inventing prompts.
