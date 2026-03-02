# 2026-02-25 Buildbot Interface Tools Proxy Gateway

Status: completed  
Created: 2026-02-25  
Updated: 2026-02-25  
Completed: 2026-02-25

## Goal

Implement interface-side proxy endpoints for BuildBot CLI docs/tools calls so:

- CLI calls interface only.
- Interface enforces PAT auth and centralized route-level rate limiting.
- Interface forwards requests to chat-api via server chat client with `x-chat-internal-key`.

## Success criteria

- New POST endpoints exist:
  - `/api/docs/search`
  - `/api/buildbot/tools/get-user`
  - `/api/buildbot/tools/get-cast`
  - `/api/buildbot/tools/get-treasury-stats`
- All endpoints require `requireBuildBotBearerAuth`.
- All endpoints apply a shared principal+IP rate limiter with `Retry-After`, and fail safely when limiter backend is unavailable.
- Proxy behavior preserves upstream status and JSON payload semantics as closely as possible.
- Tests cover auth failure, rate limit failure, success proxy behavior, and route-specific validation.
- Routing/auth boundary docs are updated and doc drift checks pass.

## Scope

In scope:

- New interface route handlers under `apps/web/app/api/docs/search` and `apps/web/app/api/buildbot/tools/**`.
- Shared server-only buildbot tools proxy helper for validation, rate limit, and chat-api pass-through.
- Route tests for the new handlers.
- Relevant docs updates under `agent-docs/references/**` (and related index/gardening artifacts as required).

Out of scope:

- Changes to existing buildbot exec/wallet storage flow currently owned by another active ledger row.
- chat-api implementation changes.

## Risks and mitigations

1. Risk: accidental divergence from upstream status/body semantics.
   Mitigation: pass through upstream status/body and cache headers (with no-store local errors), only add boundary-specific auth/rate-limit failures locally.
2. Risk: limiter outage bypasses abuse controls.
   Mitigation: fail closed with 503 + Retry-After when limiter errors occur.
3. Risk: overlap with active sibling work.
   Mitigation: keep strict file/symbol boundaries and avoid touching `buildbot/exec` + `wallet-store`.

## Planned changes

1. Add `lib/server/build-bot/tools-proxy.ts` with:
   - shared body parsing + zod validation helper
   - principal/IP key derivation
   - KV-backed rate limit check
   - chat-api proxy request function
2. Add route handlers:
   - `app/api/docs/search/route.ts`
   - `app/api/buildbot/tools/get-user/route.ts`
   - `app/api/buildbot/tools/get-cast/route.ts`
   - `app/api/buildbot/tools/get-treasury-stats/route.ts`
3. Add tests for each route path against shared mocked helper behavior and validation.
4. Update docs for route/auth boundary.
5. Run completion workflow and required checks; commit scoped files.
