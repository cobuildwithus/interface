# 2026-03-12 Hosted Protocol Plan Batch Execution

## Goal

Extend `interface` hosted CLI execution so `/api/cli/exec` accepts a first-class `protocol-plan` request and submits the whole validated plan as one smart-account user operation with idempotent replay/resume support.

## Scope

- Add `protocol-plan` request parsing, validation, policy enforcement, and route handling.
- Factor the duplicated hosted user-operation submission path shared by `tx`, `protocol-step`, and `protocol-plan`.
- Preserve the current Base-only network posture and idempotency state machine semantics.
- Add regression coverage for hosted protocol-plan success, replay, and mismatch handling.

## Constraints

- Avoid schema migrations for this first rollout unless the current log model proves unusable.
- Keep `transfer`, generic `tx`, and `protocol-step` behavior unchanged beyond shared helper refactors.
- Use the shared `wire` validator as the source of truth for semantic protocol-plan safety.

## Planned Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

## Notes

- First rollout will keep hosted idempotency on the existing log row by storing a canonical protocol-plan fingerprint without widening the DB schema.

## Status

- Completed.
  Status: completed
  Updated: 2026-03-12
  Completed: 2026-03-12
