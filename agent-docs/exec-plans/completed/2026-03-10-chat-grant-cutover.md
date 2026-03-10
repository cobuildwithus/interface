# Remove chat grant client plumbing

Status: completed
Created: 2026-03-10
Updated: 2026-03-10

## Goal

- Remove the web app's `x-chat-grant` storage and transport plumbing after the backend cutover to wallet-ownership-only chat authorization.

## Success criteria

- Chat creation/read helpers no longer model `chatGrant` or `grant`.
- Chat client transport no longer reads/writes sessionStorage grant state or sends `x-chat-grant`.
- Chat page/server component no longer passes `initialGrant`.
- All related tests/docs are updated to the new contract.

## Scope

- In scope:
- `apps/web/app/(app)/[goalAddress]/c/[chatId]/chat-section.tsx`
- `apps/web/components/features/chat/**`
- `apps/web/components/features/goals/goal-ai-input-client.tsx`
- `apps/web/lib/domains/chat/**`
- matching `agent-docs/**`
- Out of scope:
- unrelated notifications work already active in the repo
- broader chat UX changes

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm --filter web build:ci`
