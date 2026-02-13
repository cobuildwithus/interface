# Agent Guidelines

When adding files, put reusable UI in `apps/web/components` (`ui` for primitives, `layout` for app shell/nav, `common` for domain-agnostic reuse, `features/<domain>` for domain UI, `visuals` for heavy viz) and keep route-specific UI under `apps/web/app/**`. Domain logic belongs in `apps/web/lib/domains/<domain>`, shared helpers in `apps/web/lib/shared`, integrations in `apps/web/lib/integrations`, server-only modules in `apps/web/lib/server`, and hooks in `apps/web/lib/hooks`.
Keep unit/component tests co-located as `*.test.ts(x)` near the module; a sibling `__tests__` folder is ok when a module has many tests. Reserve `apps/web/tests` or `apps/web/e2e` for cross-cutting integration/e2e suites. Avoid broad barrel re-exports; small, intentional facades for a subsystem are ok, and otherwise import files directly. Update the `agent-docs/*` architecture maps when moving or adding shared modules.

## Type Safety

- Avoid `any` and `unknown` in type positions unless absolutely necessary; prefer explicit types, narrow with type guards, or validate boundary payloads (e.g. schema validation).

## Token & Treasury Language

> Content rules, not legal advice. Escalate borderline cases to human + legal.

**Do:**

- Focus on use & participation: govern, access features, route revenue, coordinate
- Use: "participants," "builders," "contributors," "holders"
- Use: "tokens," "participation," "onchain mechanism," "protocol features"
- Use hedged language: "designed to," "intended to," "under normal operation"
- Always include risk caveats: prices can go down, mechanisms can fail, liquidity may not exist

**Don't:**

- Frame tokens as investments or promise returns/upside/profit
- Use: "guaranteed," "risk-free," "can't go down," "only moves up," "safe yield"
- Use equity metaphors: "shares," "dividends," "ownership stake," "profit sharing," "claim on treasury"
- Give trading advice: "how to 10x," "when to exit," "how to de-risk"
- Use yield language: "APY," "APR," "interest-bearing," "savings account," "income stream"
- Label users as "investors" or reference "investment opportunities"
- Overstate redemption: avoid "you can always redeem" or "minimum you can walk away with"

## Farcaster Branding

- Never use "Warpcast" in user-facing copy—always say "Farcaster" instead
- Warpcast is just one client; we reference the protocol, not a specific app
- Use "Farcaster client" if you need to reference where users compose/view casts

## Wallet Identity

- Enforce a one wallet = one identity invariant across UI, auth, and server logic.
- Avoid multi-wallet flows; when a wallet changes, require a fresh login.
- Do not expose linked wallet lists from session data; only surface a single wallet identity.

## AuthButton Usage

- Use `AuthButton` to gate settings modals and user-triggered account actions so unauthenticated users cannot open them.

## Next.js Server Actions

- Never use `use server` in barrel files; only export async server actions directly from `use server` modules.
- Client components must import server actions from their defining files, not through re-exports.

## Server-First UI/Data Guidelines

- Prefer server components for reads; fetch data on the server and pass minimal props to client leaves.
- Prefer server actions for writes; refresh server data with `router.refresh()` after mutations.
- Avoid server actions for reads; they execute one-by-one. Use server components or route handlers instead.
- Keep client boundaries small and interaction-only (forms, dialogs, uploads).
- Use Suspense with skeletons for server sections to avoid layout jumps.
- For per-user data on Cache Components/PPR routes, wrap server sections in Suspense and ensure fetches use `cache: "no-store"`; for non-fetch dynamic reads without dynamic APIs, use `connection()`. Avoid heavy fetch logic directly in page files.
- Share validation/normalization in server helpers used by both routes and actions.
- Avoid client-side fetching (SWR/React Query) when data is already available server-side.

## Postgres & Caching Guardrails

- With `@prisma/extension-read-replicas`, non-transactional reads go to replicas by default. Use `prisma.$primary()` for read-after-write or consistency-sensitive reads. For raw reads (`$queryRaw`/`$queryRawUnsafe`), default to `prisma.$replica()` unless you need primary consistency.
- Pool connections enforce statement/lock/idle-in-tx timeouts on connect; avoid long-running transactions and prefer smaller, indexed queries.
- For hot KV-backed cache misses, use per-key locks (NX + TTL) to prevent stampede; see Farcaster activity caching for the pattern.

## Component Size & Decomposition

- When touching a complex page/component, extract helper hooks/components instead of adding inline logic; avoid bloating single files.
- Prefer keeping most files under ~300 LOC when feasible.

## Notes

- Keep optional living notes in `AGENT_NOTES.md`, not in this file.
- Add concise, high-signal, durable repo learnings to `AGENT_NOTES.md` when they improve future speed/accuracy.
- If a task needs historical repo context, read `AGENT_NOTES.md` first.

## Env File Access

- Never access '.env' or '.env\*' files under any circumstance. Do not read, list, grep, source, cat, open, or otherwise touch them.
