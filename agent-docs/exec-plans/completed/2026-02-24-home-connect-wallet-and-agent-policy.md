# Home connect-wallet card + agent policy alignment

Status: completed
Created: 2026-02-24
Updated: 2026-03-12

## Goal

- Ensure the home right-side user card shows one `Connect wallet` action when disconnected.
- Align root `AGENTS.md` commit/workflow policy with protocol-style assumptions checks and dirty-worktree handling.
- Keep docs-governance checks green for the current mixed code+docs change set.

## Success criteria

- `apps/web/app/(app)/home/revnet-actions-client.tsx` renders one connect CTA in disconnected state and keeps connected actions unchanged.
- `apps/web/app/(app)/home/revnet-actions-client.test.tsx` covers disconnected/connected rendering invariants.
- `AGENTS.md` includes:
- up-front assumptions check guidance
- stricter dirty-worktree behavior
- same-turn auto-commit policy using `scripts/committer`
- Docs drift and doc-gardening checks pass alongside required verification.

## Scope

- In scope:
- Home action card disconnected-state behavior and tests.
- Root agent policy/documentation updates.
- Active plan + index updates required by docs-governance checks.
- Out of scope:
- Additional UI redesign beyond connect-CTA consolidation.
- Changes to protocol repo policies.

## Constraints

- Preserve one-wallet = one-identity behavior.
- Keep connected-state action behavior unchanged.
- Do not use destructive git commands.

## Risks and mitigations

1. Risk: introducing policy drift between docs and actual workflow.
   Mitigation: codify policy in `AGENTS.md` and keep index/plan artifacts current.
2. Risk: disconnected-state UI regressions reintroducing multiple connect CTAs.
   Mitigation: enforce via targeted rendering tests.

## Tasks

1. Update home action card rendering branch for disconnected state.
2. Add/strengthen tests for disconnected and connected action states.
3. Update root `AGENTS.md` workflow and commit policy.
4. Add active plan + index update to satisfy docs drift governance.
5. Run required verification and docs checks.

## Decisions

- Use a single full-width `AuthButton` labeled `Connect wallet` for disconnected state.
- Keep `Buy`, `Cash out`, and `Take a loan` actions unchanged for connected state.
- Adopt same-turn auto-commit policy in `interface` root `AGENTS.md`.

## Verification

- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter web build:ci`
- `bash scripts/check-agent-docs-drift.sh`
- `bash scripts/doc-gardening.sh --fail-on-issues`
  Completed: 2026-03-12
