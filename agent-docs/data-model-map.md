# Cobuild Site — Data Model Map (High Level)

## Purpose

Provide a high‑level map of the Cobuild database schemas and key models referenced by the web app and indexers.

## Where the models live

- Prisma schema: `apps/web/prisma/cobuild.prisma`
- Generated client: `apps/web/generated/prisma/*`
- Prisma client wrapper (read replicas): `apps/web/lib/server/db/cobuild-db-client.ts`

The database is multi‑schema Postgres with Prisma mapping across:

- `cobuild`
- `cobuild-onchain`
- `farcaster`
- `capital_allocation`
- `juicebox`

## Schema overview + key models

### cobuild (core app data)

- `Rule`: per‑reaction rules (platform/reaction/token/amount), feeds into intents.
- `Intent`: reaction‑triggered intent to swap; links to rules, users, token metadata, and swaps.
- `Chat`: stored AI chat conversations (messages + metadata).
- `User`: Farcaster user identity (fid) for intents + donor rules.
- `TokenMetadata`: ERC‑20 metadata + prices; shared across intents/swaps/subscriptions.
- `AccountCoin`: per‑wallet token inventory (links to `TokenMetadata`).
- `Subscription`: DCA/subscription settings per wallet + token pair.
- `DonorAllocationRule`: per‑donor allocation logic (selection + distribution).
- `FunderRanking`, `Cobuild`: aggregated project stats.
- `UserDisallowedTokenCategory`: token category exclusions per user.

### cobuild-onchain (indexed onchain events)

- `SwapExecuted`: executed swaps (tx hash, amounts, token in/out); joins to intents.
- `BatchReactionSwap`: batched reaction swap events (token in/out, router).
- `ZoraCoin`, `ClankerCoin`: token provenance from onchain sources.

### farcaster (social graph + content)

- `FarcasterProfile`: fid, usernames, verified addresses, Neynar score.
- `FarcasterCast`: cast content, embeds, author link.
- `FarcasterReaction`: reaction records (read‑only in app).

### capital_allocation (rounds + AI grading)

- `PostFilterRule`: rule definition, clauses, requirement text/embeddings.
- `Round`: evaluation rounds (variant, status, rule relationship).
- `RoundSubmission`: per‑round submissions (source, post id, metadata, AI fields).
- `PostEvalDuel`: pairwise duels between submissions.
- `PostEvalScore`: scores + ranking per submission.
- `AiModelOutput`: AI model output for post/rule context.
- `PerAddressRuleSubmission`: de‑dupe and submission limiting by address/rule.

### juicebox (revnet/project indexing)

- `JuiceboxProject`: project/treasury state, metadata, ruleset pointer.
- `JuiceboxRuleset`: ruleset configuration snapshot.
- `JuiceboxParticipant`: participant balances and metadata.
- `JuiceboxPayEvent`: pay/issue events.
- `JuiceboxCashoutCoefficientSnapshot`: cashout coefficient history.
- `JuiceboxSuckerGroup`: grouping metadata.

## Key relationships (common joins)

- `Intent` → `Rule`, `User` (fid), `TokenMetadata` (spend + target), `SwapExecuted` (tx hash).
- `TokenMetadata` ↔ `Cobuild` (1–1 on chainId + address), ↔ `AccountCoin`.
- `PostFilterRule` → `Round` → `RoundSubmission` → `PostEvalScore`/`PostEvalDuel`.
- `FarcasterProfile` ↔ `User` (fid), `FarcasterCast` → `FarcasterProfile`.
- `JuiceboxProject` ↔ `JuiceboxRuleset`/`JuiceboxParticipant`/`JuiceboxPayEvent`.

## Notes

- The Prisma schema maps to existing DB tables; many tables are populated by external indexers/services (the web app primarily reads, with some writes for rules/moderation/submissions).
- For edits to schema structure, update `apps/web/prisma/cobuild.prisma` and regenerate Prisma client.
