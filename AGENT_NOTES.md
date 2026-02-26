# Agent Notes

Optional, living memory for helpful repo learnings.

- Add concise, high-signal notes when they improve future speed/accuracy; skip trivial or temporary details.
- Organize notes with short labels (for example: `Routing`, `Data`, `UI`, `Gotchas`) so they stay scannable.
- Prefer durable facts (patterns, pitfalls, commands, ownership, architecture links) over task transcripts.
- Use discretion: you do not need to add notes every time.

## Helper: Chart Containers

- For Recharts `ResponsiveContainer`, always ensure a positive measurable chart size at mount.
- Avoid mounting charts inside `hidden` / `display: none` breakpoint branches; conditionally render a single branch instead.
- Prefer explicit numeric chart height (or reliable `min-h-*`) over fragile `height="100%"` chains when visibility/layout can change.

## Helper: Skills

- Use `vercel-react-best-practices` when adding or changing pages/components, data fetching, or client bundles; prioritize CRITICAL/HIGH items first.
- Use `web-design-guidelines` for UI/UX/accessibility checks on new or heavily modified user-facing pages.
- Run a best-practices review pass before finalizing a PR or large UI change.
- Skills are stored in this repo at `.agents/skills/<skill-name>/SKILL.md`; load from there if not present in the global skills list.
- If a required skill is missing from `.agents/skills`, run `pnpm setup:skills` once, then continue.

## Helper: Architecture Docs

- `agent-docs/onchain-abis-and-writes.md`
- `agent-docs/libs-utilities-map.md`
- `agent-docs/data-model-map.md`

## Helper: Tooling & CI

- CI workflows currently run web-only checks on Node 20: `pnpm typecheck` and `pnpm --filter web test`.
- Web tests enforce per-file coverage gates in `apps/web/vitest.config.ts` (lines/functions/statements 85%, branches 80%); add tests with behavior changes or coverage will fail.
- Pre-commit only runs `lint-staged` + Prettier (`.husky/pre-commit`); lint/typecheck/tests are not automatic locally unless you run them.

## Helper: Address & Session Invariants

- Normalize user wallet addresses with `normalizeAddress(...)` from `apps/web/lib/shared/address.ts` before DB/cache reads-writes.
- `apps/web/app/(app)/layout.tsx` mounts `WalletIdentityGuard`, which logs users out if connected wallet and session wallet diverge; do not design flows that assume multi-wallet continuity.
- Session identity is sourced from the `privy-id-token` cookie and verified against `PRIVY_VERIFICATION_KEY`; keep auth/server code aligned to that contract.

## Helper: Cache Tags & Invalidation

- Round flows rely on explicit tags (`rounds:list`, `round:<id>`, `round:submissions:<ruleId>`, `round:<id>:entity-ids`); mutation paths should revalidate related tags.
- Farcaster social flows rely on `farcaster:discussion:cobuild`, `farcaster:thread:cobuild`, and profile/signer tags; revalidate after publish/hide/delete/profile updates.
- Linked account cache tags are per-address via `getLinkedAccountsCacheTag(address)`; use the helper instead of hardcoding tag strings.

## Helper: DB & Cache Behavior

- Prisma is configured with read replicas; default reads are replica-backed. Use `prisma.$primary()` for read-after-write consistency (for example immediate post-mutation UI reads).
- DB pools apply strict timeouts on connect (`statement_timeout`, `lock_timeout`, `idle_in_transaction_session_timeout`); avoid long transactions and unbounded queries.
- Farcaster activity cache uses KV lock keys (`NX` + short TTL) to prevent stampedes; follow that pattern for other hot-key cache misses.

## Helper: Chat Integration

- Server chat requests should go through `fetchChatApi` (`apps/web/lib/domains/chat/server-api.ts`) so `privy-id-token` and optional `x-chat-internal-key` headers are applied consistently.
- `chatApiBase` resolution order: `NEXT_PUBLIC_CHAT_API_URL` -> browser origin/localhost behavior -> `NEXT_PUBLIC_SITE_URL` in prod -> `http://localhost:4000`.

## Helper: Generated Artifacts

- Prisma client is generated to `apps/web/generated/prisma`; schema edits in `apps/web/prisma/cobuild.prisma` require regeneration (`pnpm --filter web db:generate`).
- Onchain ABI/address files in web are generated artifacts; prefer editing `apps/contracts/*` and regenerating, not hand-editing generated outputs.

## Helper: Uploads

- Image upload validation rules are centralized in `apps/web/lib/integrations/images/upload-rules.ts` and consumed by both `/api/images/upload` and `lib/integrations/images/upload-client.ts`; update that shared module when changing MIME allowlist or max size.
