# Coordination Ledger (Active Only)

Use this file only for currently active coding work. Keep it minimal and current.

## Open Entries

| Agent/Session                      | Task                                                                              | Files in Scope                                                                                                 | Symbols (add/rename/delete)                                                     | Dependency Notes                                                                                          | Updated (YYYY-MM-DD) |
| ---------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------- |
| codex-onchain-client-network-guard | Reject unsupported onchain client chain IDs instead of falling through to mainnet | `apps/web/lib/domains/token/onchain/clients.ts`, `apps/web/lib/domains/token/onchain/onchain-coverage.test.ts` | add supported-chain guard for `getClient`; update rejection regression coverage | Isolated to token onchain client helper; avoid hosted CLI exec and auth files owned by other active tasks | 2026-03-10           |

## Rules

1. Add a row before your first code edit for every coding task (single-agent and multi-agent).
2. Update your row immediately when scope or symbol-change intent changes.
3. Before deleting or renaming a symbol, check this table for dependencies.
4. Delete your row as soon as the task is complete or abandoned.
5. Leave only the header and empty table when there is no active work.
