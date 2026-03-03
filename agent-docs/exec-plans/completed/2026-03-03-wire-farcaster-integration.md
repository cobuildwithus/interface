# 2026-03-03 Wire Farcaster Integration (Active)

## Goal

Eliminate duplicated Farcaster signup contract/typed-data/planning logic in interface by consuming the shared `@cobuild/wire` Farcaster module, while preserving current CLI API behavior and test coverage.

## Scope

- `apps/web/lib/server/cli/farcaster-signup.ts`
- `apps/web/lib/server/cli/farcaster-signup.test.ts`
- `agent-docs/exec-plans/active/COORDINATION_LEDGER.md`

## Invariants

- Keep API route behavior unchanged for:
  - already-registered conflict handling
  - needs-funding response shape and ETH/wei fields
  - successful signup + key add flow semantics
- Keep network fixed to Optimism for signup writes.
- No backward-compatibility shim layer.

## Plan

1. Replace local Farcaster constants/ABIs and typed-data construction with wire exports.
2. Use wire preflight + call-plan helpers to build user-operation calls.
3. Update tests only where behavior-preserving refactor changes mock expectations.
4. Run required verification and completion audit workflow.
