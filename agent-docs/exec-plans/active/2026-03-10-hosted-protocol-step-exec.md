# 2026-03-10 Hosted Protocol Step Execution

## Goal

Cut hosted protocol writes off the generic raw-tx safety path by adding a first-class `protocol-step` execution route contract in `interface`.

## Scope

- Extend `/api/cli/exec` to accept hosted `protocol-step` requests.
- Enforce protocol-step validation with shared `wire` helpers instead of env allowlists.
- Preserve existing hosted idempotency, pending, and confirmation behavior.
- Add regression coverage for protocol-step success, replay, and failure handling.

## Constraints

- Keep `transfer` and generic `tx` behavior unchanged outside the new protocol-step branch.
- Avoid schema migrations unless the implementation cannot stay auditable without them.
- Maintain the current Base-only hosted execution posture.

## Planned Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

## Status

- Completed on 2026-03-10.
- Added a first-class hosted `protocol-step` branch to `/api/cli/exec`.
- Kept raw `tx` allowlists scoped to the generic raw-tx path while protocol-step safety now comes from the shared `wire` contract.
- Verification passed: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:coverage`, `pnpm --filter web build:ci`.
