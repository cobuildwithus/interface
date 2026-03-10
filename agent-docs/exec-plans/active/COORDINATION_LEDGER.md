# Coordination Ledger (Active Only)

Use this file only for currently active coding work. Keep it minimal and current.

## Open Entries

| Agent/Session                          | Task                                                                                            | Files in Scope                                                                                                                                                                                                                        | Symbols (add/rename/delete)                                                                                                                                                | Dependency Notes                                                                                                  | Updated (YYYY-MM-DD) |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------- |
| Codex / chat-grant-cutover             | Remove chat grant storage/transport and align chat-api contracts to ownership-only auth         | `apps/web/app/(app)/[goalAddress]/c/[chatId]/chat-section.tsx`, `apps/web/components/features/chat/**`, `apps/web/components/features/goals/goal-ai-input-client.tsx`, `apps/web/lib/domains/chat/**`, matching `agent-docs/**` notes | Delete grant storage helpers and `initialGrant` plumbing, remove grant request/response assumptions from chat create/get helpers and tests                                 | Depends on chat-api removing grant headers/payloads in the same change; do not touch unrelated notifications work | 2026-03-10           |
| Codex / notification-completeness-pass | Make protocol notification destinations and wrappers actionable for remaining lifecycle reasons | `apps/web/lib/domains/notifications/**`, `apps/web/app/(app)/[goalAddress]/events/page.tsx`, `apps/web/app/(app)/[goalAddress]/allocate/**`, matching `agent-docs/**`                                                                 | Add notification route-state parsing and page focus handling for success-assertion/budget/mechanism/dispute notifications; keep wrapper aligned with shared wire presenter | Must consume the shared `wire` presenter contract without reintroducing UI-owned protocol semantics               | 2026-03-10           |

## Rules

1. Add a row before your first code edit for every coding task (single-agent and multi-agent).
2. Update your row immediately when scope or symbol-change intent changes.
3. Before deleting or renaming a symbol, check this table for dependencies.
4. Delete your row as soon as the task is complete or abandoned.
5. Leave only the header and empty table when there is no active work.
