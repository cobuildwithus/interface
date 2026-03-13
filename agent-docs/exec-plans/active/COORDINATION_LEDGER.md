# Coordination Ledger (Active Only)

Use this file only for currently active coding work. Keep it minimal and current.

## Open Entries

| Agent/Session | Task                                                                                                                               | Files in Scope                                                           | Symbols (add/rename/delete) | Dependency Notes                                                                                                                     | Updated (YYYY-MM-DD) |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| Codex         | Normalize both direct `@cobuild/wire` consumers to the latest published wire version, and be ready for the next published refresh. | `apps/web/package.json`, `apps/contracts/package.json`, `pnpm-lock.yaml` | None planned.               | `apps/contracts` is now aligned to published `^0.3.0`; a further bump remains blocked until the next `@cobuild/wire` publish exists. | 2026-03-13           |

## Rules

1. Add a row before your first code edit for every coding task (single-agent and multi-agent).
2. Update your row immediately when scope or symbol-change intent changes.
3. Before deleting or renaming a symbol, check this table for dependencies.
4. Delete your row as soon as the task is complete or abandoned.
5. Leave only the header and empty table when there is no active work.
