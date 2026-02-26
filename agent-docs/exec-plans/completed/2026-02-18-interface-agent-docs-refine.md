# Interface agent-docs and architecture refinement

Status: completed
Created: 2026-02-18
Updated: 2026-02-18

## Goal

- Refine interface architecture and agent-docs so core flows (auth/wallet, onchain execution, data/cache, API boundaries) are explicit, enforceable, and easy for agents to navigate.

## Success criteria

- Core docs rewritten with concrete file-backed guidance.
- Internal references added for runtime flows and boundaries.
- Drift/doc-gardening scripts enforce expanded docs and references.
- Verification passes (`typecheck`, `test`, doc checks).

## Scope

- In scope:
  - `ARCHITECTURE.md`, `AGENTS.md`, `apps/web/AGENTS.md`
  - `agent-docs/*` quality + references
  - doc enforcement scripts/workflow updates
- Out of scope:
  - product code logic changes
  - visual/UI behavior changes

## Constraints

- Do not touch `.env` files.
- Keep docs grounded to current repository structure.
- Preserve existing coding and CI conventions.

## Risks and mitigations

1. Risk: docs drift from actual implementation.
   Mitigation: include file-backed references and tighten drift checks.

2. Risk: overly broad generic docs reduce signal.
   Mitigation: prefer concrete maps and update triggers.

## Tasks

1. Gather architecture/auth/onchain/data/CI context.
2. Rewrite top-level architecture + agent docs with concrete invariants.
3. Add internal runtime reference docs and expand external reference packs.
4. Tighten doc drift/gardening enforcement.
5. Run verification and summarize.

## Decisions

- Strengthen index with owner/cadence/criticality fields.
- Track `references/*-llms.txt` in doc-gardening checks.
- Require richer plan templates for higher-signal execution plans.

## Verification

- Commands to run:
  - `bash scripts/doc-gardening.sh --fail-on-issues`
  - `bash scripts/check-agent-docs-drift.sh`
  - `pnpm typecheck`
  - `pnpm test`
- Expected outcomes:
  - all pass without new failures.
    Completed: 2026-02-18
