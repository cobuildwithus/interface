# Quality Score

Snapshot date: 2026-02-26

Scoring rubric:

- `5`: strong guardrails + tests + docs + CI enforcement
- `4`: good guardrails with minor documented gaps
- `3`: acceptable baseline, clear follow-up needed
- `2`: fragile/high regression risk
- `1`: no reliable guardrails

| Area                                         | Score (1-5) | Evidence                                                                                                                | Next follow-up                                                               |
| -------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| App Router + route composition               | 4           | Clear `(app)` / `(marketing)` separation and API handlers under `app/api/**`.                                           | Keep route-flow reference updated for new endpoints.                         |
| Shared UI primitives and feature composition | 4           | Mature `components/ui` and feature folders with strong reuse docs.                                                      | Continue reducing one-off route-local variants.                              |
| Auth + wallet identity model                 | 4           | Session parsing + wallet mismatch guard + auth-gated button pattern.                                                    | Add regression tests around wallet switch edge cases.                        |
| Onchain execution pipeline                   | 4           | Shared write hooks and generated ABI/address flow are well defined.                                                     | Keep UX/error parity across all write surfaces.                              |
| Server data + cache consistency              | 3           | Prisma read-replica extension + KV patterns in place.                                                                   | Expand explicit primary-safe guidance where read-after-write matters.        |
| API route boundary quality                   | 3           | Route validation/normalization is present in key handlers.                                                              | Add/standardize response envelope contracts and redaction guidance.          |
| Test and CI posture                          | 4           | Lint/typecheck/tests/build in CI plus coverage artifact workflow.                                                       | Add explicit coverage threshold gate if needed.                              |
| Agent docs enforcement                       | 5           | Drift checks enforce non-generated docs-or-active-plan coupling; local pre-commit now auto-generates/stages doc-gardening artifacts. | Keep required artifact list and hook behavior aligned with future doc workflow changes. |

## Top Risk Register

1. Drift between docs and fast-moving route/domain code.
2. Replica/read consistency assumptions in complex multi-step flows.
3. Third-party integration error surfaces leaking low-signal messages.
