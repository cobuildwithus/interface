# Cobuild Site — Libraries & Utilities Map (High Level)

## Purpose

High-level map of shared libraries/utilities in `apps/web/lib`, focused on common helpers, domain services, and infrastructure utilities.

## Top-Level Layout

- `lib/shared/*` — Pure helpers (text, numbers, formatting, classnames).
- `lib/config/*` — Config + feature flags + constants.
- `lib/integrations/*` — External API clients + fetch utilities.
- `lib/domains/*` — Domain logic (rounds, rules, token, goals, chat, social, etc).
- `lib/server/*` — Server-only infra (db, kv, server helpers).
- `lib/hooks/*` — Client hooks and interaction utilities.

## Core Utilities (shared)

- `apps/web/lib/shared/utils.ts`: className merge (`cn`) + address truncation.
- `apps/web/lib/shared/numbers.ts`: numeric normalization + decimal helpers.
- `apps/web/lib/shared/json.ts`: JSON-safe value + record types for boundary data.
- `apps/web/lib/shared/errors.ts`: shared error-like typing for user-facing messages.
- `apps/web/lib/shared/entity-id.ts`: normalize/parse Farcaster hashes + X status IDs.
- `apps/web/lib/shared/text/*`: text helpers (truncate, pluralize, strip emoji).
- `apps/web/lib/shared/currency/*`: currency formatting.
- `apps/web/lib/shared/page-metadata.ts`: build consistent Next.js metadata objects.

## Auth + Session

- `apps/web/lib/domains/auth/session.ts`: Privy JWT parsing + Farcaster resolution.
- `apps/web/lib/domains/auth/use-login.ts`: Privy login/connect wrapper.
- `apps/web/lib/domains/auth/use-auth-click.ts`: click gating for auth/connected wallet.
- `apps/web/lib/domains/auth/linked-accounts/*`: linked account parsing/typing + sync.

## HTTP + API Clients (integrations)

- `apps/web/lib/integrations/http/fetch.ts`: fetch with timeout + retry + 429 backoff.
- `apps/web/lib/integrations/github/prompts.ts`: GitHub prompt fetcher with caching + parsing.
- `apps/web/lib/integrations/farcaster/*`: Farcaster API clients + parsing helpers.
- `apps/web/lib/integrations/twitter/*`: X/Twitter parsing helpers.
- `apps/web/lib/integrations/whisk/*`: Whisk API client.
- `apps/web/lib/integrations/images/*`: upload client helpers.

## Domain Modules

Rounds + rules

- `apps/web/lib/domains/rounds/*`: round fetching, normalization, timing, submissions.
- `apps/web/lib/domains/rules/rules/*`: clause schema + normalization/checks.
- `apps/web/lib/domains/rules/rules-api/*`: server-side calls to rules service.
- `apps/web/lib/domains/rules/cast-rules/*` + `tweet-rules/*`: platform-specific rule checks.

Token + onchain

- `apps/web/lib/domains/token/onchain/*`: chains, addresses, quote math, revnet config.
- `apps/web/lib/domains/token/onchain/wagmi-config.ts`: wagmi config.
- `apps/web/lib/domains/token/juicebox/*`: fee math, project stats, issuance history.
- `apps/web/lib/domains/token/intent-stats/*`: intent aggregation + types.
- `apps/web/lib/domains/token/intent-swaps/*`: swaps aggregation helpers.
- `apps/web/lib/domains/token/recent-activity.ts`: recent swap + pending intent activity for wallets.
- `apps/web/lib/domains/token/rewards.ts`: reward distribution math.
- `apps/web/lib/domains/token/usdc.ts`: USDC helpers.

Goals + chat

- `apps/web/lib/domains/goals/*`: goal scopes + raise-1m helpers.
- `apps/web/lib/domains/goals/action-card-read.ts`: per-wallet goal action card read-state persistence (KV).
- `apps/web/lib/domains/goals/ai-context/*`: AI context build + prompt helpers.
- `apps/web/lib/domains/chat/*`: chat client + messages + intent helpers.

Social + profiles

- `apps/web/lib/domains/social/*`: platforms + ownership helpers.
- `apps/web/lib/domains/social/cast-read/*` + `cast-view/*`: cast data helpers.
- `apps/web/lib/domains/content/content.ts`: static manifesto/beliefs/charter strings.
- `apps/web/lib/domains/content/github-prompts.ts`: GitHub-backed prompt resolver with local fallback.
- `apps/web/lib/domains/profile/*`: profile fetch + types + defaults.

Builders + eligibility

- `apps/web/lib/domains/builders/*`: builder list + ENS resolution.
- `apps/web/lib/domains/eligibility/*`: eligibility scores + constants.

## Data Access (server)

- `apps/web/lib/server/db/*`: Prisma client with read replica setup.
- `apps/web/lib/server/kv/*`: KV encryption + store helpers.
- `apps/web/lib/server/*`: server-only actions (onramp URL, Farcaster profile updates, etc.).

## Hooks (client-side)

- `apps/web/lib/hooks/*`: data-fetch + onchain read/write hooks (e.g., `use-command-enter`, `use-cmd-enter`, `use-mobile`).

## Notes

- Tests live adjacent to their modules (`*.test.ts`, `*.coverage.test.ts`).
- Prefer domain folders under `lib/domains/` for cross-feature reuse.
