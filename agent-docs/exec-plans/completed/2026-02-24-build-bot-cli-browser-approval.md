# CLI CLI browser approval flow on `/home`

Status: completed
Created: 2026-02-24  
Updated: 2026-03-12

## Goal

Add a secure browser-mediated setup flow so `CLI setup` can generate a PAT without manual copy/paste:

- CLI opens `/home` with setup query params.
- Home shows an approval dialog.
- User approves once.
- Interface mints PAT and relays it to CLI over localhost callback.

## Success criteria

- `/home` renders a setup dialog when valid `cliSetup` query params are present.
- Dialog requires authenticated wallet/session before approval.
- Dialog POSTs `/api/CLI/token`, then POSTs `{ state, token }` to loopback callback URL.
- Callback URLs are strictly loopback + state-bound path format.
- CLI callback session validates origin + state and times out safely.
- Existing setup/manual fallback behavior remains intact.

## Scope

In scope:

- `CLI` secure localhost callback session and setup URL generation.
- `interface/apps/web` home dialog and query-parameter parser.
- Tests/docs updates for new setup flow.

Out of scope:

- New server API routes.
- Multi-device account linking/OAuth exchange changes.

## Risks and mitigations

1. Risk: token exfiltration via arbitrary callback URL.
   Mitigation: enforce loopback host + exact callback path bound to random state.
2. Risk: unauthorized callback posts.
   Mitigation: enforce expected browser `Origin` and state match in CLI callback session.
3. Risk: setup dead-ends if browser approval fails.
   Mitigation: preserve hidden manual PAT prompt fallback.

## Verification

- `CLI`: `pnpm typecheck`, `pnpm test`, `pnpm test:coverage`, `pnpm build`
- `interface`: `pnpm typecheck`, `pnpm test`, `pnpm --filter web build:ci`
  Completed: 2026-03-12
