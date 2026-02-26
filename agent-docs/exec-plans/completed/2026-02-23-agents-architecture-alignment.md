# Agents and architecture alignment with cobuild-protocol

Status: completed
Created: 2026-02-23
Updated: 2026-02-23

## Goal

- Align this repo's agent/architecture governance with the co-build protocol style while preserving web-app-specific constraints and verification commands.
- Add missing process artifacts (completion prompts, module boundaries, stronger docs drift coupling) that improve execution quality for multi-file agent work.

## Success criteria

- Root `AGENTS.md` uses protocol-style sections and explicitly allows progress in dirty trees.
- Missing architecture/process artifacts are added and wired into docs maps.
- Drift checker enforces non-generated-docs-or-active-plan coupling for architecture-sensitive changes.
- Required verification commands (`pnpm typecheck`, `pnpm test`) pass at handoff.

## Scope

- In scope:
- Root `AGENTS.md` structure/policy alignment.
- `agent-docs` updates for references, plans policy, and completion prompts.
- Drift-check script alignment and CI map corrections.
- Out of scope:
- Runtime product feature changes in `apps/web/**`.
- Workflow YAML behavior changes.

## Constraints

- Technical constraints:
- Keep web-specific command set and avoid Solidity-specific verification requirements.
- Avoid destructive git operations and do not revert unrelated local changes.
- Product/process constraints:
- Follow repo rule: add an active execution plan for this multi-file process update.
- Keep docs concise and internally consistent (`agent-docs/index.md` as canonical map).

## Risks and mitigations

1. Risk: introducing policy text that conflicts with existing repo commands or file layout.
   Mitigation: validate all referenced paths/scripts exist before finalizing docs.
2. Risk: strengthening drift checks may create false positives.
   Mitigation: mirror proven co-build coupling logic and keep explicit error messaging.

## Tasks

1. Update root `AGENTS.md` to protocol-style structure with dirty-tree continuity guidance.
2. Add completion prompts under `agent-docs/prompts/`.
3. Add `agent-docs/references/module-boundary-map.md` and wire into read-order/index docs.
4. Strengthen `scripts/check-agent-docs-drift.sh` and align `testing-ci-map.md`.
5. Run required verification and capture outcomes.

## Decisions

- Keep required checks centered on existing web commands (`pnpm typecheck`, `pnpm test`, optional `pnpm --filter web build:ci` based on touched paths).
- Add protocol-style completion workflow prompts verbatim in structure but web-adapted in audit focus.
- Add module boundary reference for clearer import-direction and ownership guidance.

## Verification

- Commands to run:
- `pnpm typecheck`
- `pnpm test`
- Expected outcomes:
- All commands exit `0` with no new failures attributable to this docs/process change set.
  Completed: 2026-02-23
