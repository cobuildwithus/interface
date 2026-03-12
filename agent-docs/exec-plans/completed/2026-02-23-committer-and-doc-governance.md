# Add committer script and missing docs governance controls

Status: completed
Created: 2026-02-23
Updated: 2026-03-12

## Goal

- Port the co-build protocol selective commit helper into this repo and close remaining high-value governance gaps around docs maintenance/enforcement.
- Keep changes web-repo specific and avoid Solidity-only process assumptions.

## Success criteria

- `scripts/committer` exists with expected selective-commit behavior and is documented for contributors/agents.
- CI includes doc-gardening enforcement and a scheduled doc-gardening workflow.
- Architecture/process docs are updated to reflect the new workflow and commit helper guidance.
- Verification passes: docs drift, doc gardening, typecheck, and tests.

## Scope

- In scope:
- Add `scripts/committer`.
- Update governance docs (`AGENTS.md`, `README.md`, testing CI map).
- Add/update CI workflows related to docs maintenance.
- Update drift detection patterns for newly added workflow.
- Out of scope:
- Runtime feature/product changes in `apps/web/**`.
- Any commit action for this turn.

## Constraints

- Technical constraints:
- Preserve dirty worktree safety and avoid destructive git commands.
- Keep script behavior aligned with protocol helper semantics.
- Product/process constraints:
- Keep changes practical for interface/web stack (no Solidity-specific checks).
- Run required verification before handoff.

## Risks and mitigations

1. Risk: New workflow or script policy creates friction/noise in CI.
   Mitigation: Reuse known-good protocol patterns and verify with local doc checks before handoff.
2. Risk: Commit helper usage ambiguity for contributors.
   Mitigation: Add explicit usage in `README.md` and `AGENTS.md`.

## Tasks

1. Copy `scripts/committer` from protocol and make executable.
2. Wire commit helper policy into `AGENTS.md` and usage docs in `README.md`.
3. Add CI doc-gardening enforcement in `test.yml` and add scheduled `doc-gardening.yml`.
4. Update docs references and drift script patterns.
5. Run verification and report outcomes.

## Decisions

- Use the protocol committer implementation verbatim except commit-message example wording.
- Enforce generated doc artifact sync in CI test workflow.

## Verification

- Commands to run:
- `bash scripts/check-agent-docs-drift.sh`
- `bash scripts/doc-gardening.sh --fail-on-issues`
- `pnpm typecheck`
- `pnpm test`
- Expected outcomes:
- All commands exit `0`.
  Completed: 2026-03-12
