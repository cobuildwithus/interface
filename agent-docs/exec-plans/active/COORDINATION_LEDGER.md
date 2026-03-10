# Coordination Ledger (Active Only)

Use this file only for currently active coding work. Keep it minimal and current.

## Open Entries

| Agent/Session           | Task                                                    | Files in Scope                                                                                                                                                                                                                                                                                                                                                           | Symbols (add/rename/delete)                                                                                                                                                                         | Dependency Notes                                                                                                                                     | Updated (YYYY-MM-DD) |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| codex-audit-remediation | Harden hosted CLI auth/exec/write boundaries from audit | `apps/web/app/api/cli/exec/**`, `apps/web/lib/server/cli/**`, `apps/web/prisma/cobuild.prisma`, `apps/web/prisma/sql/**`, `apps/web/app/(app)/actions/swaps-direct-intent.ts`, `apps/web/lib/server/swaps-direct-intent.ts`, `apps/web/app/(app)/actions/usdc-permit.ts`, `apps/web/lib/server/usdc-permit.ts`, `apps/web/app/(app)/goals/create/**`, related tests/docs | add live-session auth checks; add hosted exec state fields/helpers; add resumable user-op responses; tighten transfer policy/body-size/direct-intent/permit validation; remove unsafe goal defaults | Must stay clear of active marketing + notification files above; coordinates with `chat-api`, `cli`, and `wire` on session/network/response contracts | 2026-03-10           |

## Rules

1. Add a row before your first code edit for every coding task (single-agent and multi-agent).
2. Update your row immediately when scope or symbol-change intent changes.
3. Before deleting or renaming a symbol, check this table for dependencies.
4. Delete your row as soon as the task is complete or abandoned.
5. Leave only the header and empty table when there is no active work.
