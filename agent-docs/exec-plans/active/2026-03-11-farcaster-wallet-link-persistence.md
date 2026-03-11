Goal

- Keep interface-owned Farcaster signup and signer-connect flows writing both `verified_addresses` and `manual_verified_addresses`, including backfilling the manual array when the verified array already contains the wallet.

Constraints/Assumptions

- Do not edit `save-verified-address.ts` or hosted CLI signup files because active ledger ownership already exists there.
- Preserve current web behavior for linked social account updates and cache revalidation.

Key decisions

- Introduce a new helper for wallet-link persistence instead of modifying the currently owned helper file.
- Repoint existing web call sites to the new helper so interface flows get the bug fix without cross-task collisions.

State

- Done: scoped interface-owned files and confirmed existing call sites.
- Done: added the helper + tests and switched web signup/signer call sites.
- Done: verified with `pnpm typecheck`, `pnpm test`, `pnpm test:coverage`, and `pnpm --filter web build:ci`.
- Done: confirmed `pnpm lint` remains blocked only by an unrelated pre-existing formatting issue in `apps/web/lib/domains/notifications/protocol-materialization-sql.test.ts`.
- Now: none.
- Next: none.
