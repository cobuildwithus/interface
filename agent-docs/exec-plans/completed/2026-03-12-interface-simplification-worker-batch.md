# 2026-03-12 Interface Simplification Worker Batch

## Goal

Implement the requested behavior-preserving simplification batch across goal creation, image uploads, auth/session data flow, settings autosave, account-linking orchestration, shared validation, and client data fetching while keeping the tree compiling and preserving the one-wallet-one-identity invariant.

## Success Criteria

- `CreateGoalForm` domain logic moves behind reusable schema/helpers and smaller UI sections.
- Repeated image-upload state machines converge on shared primitives.
- Session lookup is request-scoped and repeated server leaves stop resolving auth independently when parent data is already known.
- Settings autosave flow is shared instead of duplicated.
- Account-linking orchestration is centralized behind one client hook/core path.
- Linked-account and signer client fetches stop using SWR and share the React Query data layer already installed in the app.
- Round creation client/server validation shares one domain schema/normalizer.
- Linked-account consumer types get normalized enough to remove repeated `platformId` parsing at leaf call sites.
- Avoid broad `router.refresh()` when touched flows can update locally/cached state instead.

## Scope

- `apps/web/app/(app)/goals/create/**`
- `apps/web/app/(app)/rounds/**`
- `apps/web/app/(app)/create-post/**`
- `apps/web/app/(app)/cast/[hash]/**`
- `apps/web/app/(app)/settings/**`
- `apps/web/components/ui/chat-input/**`
- `apps/web/components/features/auth/**`
- `apps/web/components/features/settings/**`
- `apps/web/lib/domains/auth/**`
- `apps/web/lib/domains/goals/**`
- `apps/web/lib/hooks/**`
- related server helpers, tests, and architecture docs required by these changes

## Out of Scope

- New product behavior or UX beyond structural cleanup.
- Backward-compatibility shims for replaced local helpers.
- Unrelated dirty worktree changes already present before this task.

## Constraints

- Follow `AGENTS.md` hard rules, especially the coordination-ledger gate and one-wallet-one-identity invariant.
- Do not access `.env` files.
- Use `AuthButton` for user-triggered auth/account actions.
- Keep worker file ownership disjoint; if scope needs to change, update the ledger before more code edits.
- Heavy verification runs happen once near the end; do not run them concurrently with other heavy commands.

## Worker Lanes

1. `codex-worker-t1-goal-create-round`
   - Goal-create schema/hook/section split plus shared round create validation.
2. `codex-worker-t2-image-upload`
   - Shared image upload primitives across create-post, inline reply, chat input, and Farcaster profile settings.
3. `codex-worker-t3-auth-session-data`
   - Request-scoped session caching, server-side auth data passing, and linked-account type normalization on server consumers.
4. `codex-worker-t4-settings-autosave`
   - Shared autosaved-settings abstraction for rules config and token category preferences.
5. `codex-worker-t5-account-linking-client-data`
   - Central account-linking hook/core, React Query migration for touched client fetch hooks, and localized refresh cleanup in touched auth/settings flows.

## Integration Notes

- Expect cross-lane interface stitching between server-side account/session shaping and client-side hooks.
- Parent thread owns plan/ledger/docs plus final integration for any remaining seams after worker diffs land.
- If a worker reports blocked scope, integrate the minimal unblock locally and relaunch only that lane.

## Planned Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`

## Required Audit Passes

- `agent-docs/prompts/simplify.md`
- `agent-docs/prompts/test-coverage-audit.md`
- `agent-docs/prompts/task-finish-review.md`
  Status: completed
  Updated: 2026-03-12
  Completed: 2026-03-12
