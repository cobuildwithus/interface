# Interface Agent Docs Index

Last verified: 2026-03-05 (web DB target routing + local sync helper)

## Purpose

This index is the table of contents for durable, repository-local context that agents should use.

## Canonical Docs

| Path                                                | Purpose                                                                 | Source of truth                                                | Owner                     | Review cadence               | Criticality | Last verified |
| --------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------- | ---------------------------- | ----------- | ------------- |
| `ARCHITECTURE.md`                                   | System-level architecture map and cross-cutting invariants.             | `apps/web/**`, `apps/contracts/**`, runtime composition docs   | Web Maintainers           | Per architecture PR          | High        | 2026-02-25    |
| `agent-docs/design-docs/index.md`                   | Index for durable design/principles docs.                               | `agent-docs/design-docs/**`                                    | Web Maintainers           | Monthly                      | Medium      | 2026-02-18    |
| `agent-docs/design-docs/core-beliefs.md`            | Core beliefs for agent-first repository operations.                     | Team process + architecture decisions                          | Web Maintainers           | Quarterly                    | Medium      | 2026-02-18    |
| `agent-docs/product-specs/index.md`                 | Index for product-facing constraints.                                   | `agent-docs/product-specs/**`                                  | Product + Web Maintainers | Monthly                      | High        | 2026-02-18    |
| `agent-docs/product-specs/content-language.md`      | Token/treasury/platform language constraints.                           | Product and legal/comms constraints                            | Product + Web Maintainers | Per copy-affecting PR        | High        | 2026-02-18    |
| `agent-docs/DESIGN.md`                              | Design-system intent, constraints, and decision rubric.                 | `apps/web/components/**`, `apps/web/app/**`, `app/globals.css` | Design + Web Maintainers  | Per UI-system PR             | High        | 2026-02-18    |
| `agent-docs/FRONTEND.md`                            | Frontend layering, server/client boundaries, and implementation rules.  | `apps/web/app/**`, `apps/web/components/**`, `apps/web/lib/**` | Web Maintainers           | Per architecture PR          | High        | 2026-02-23    |
| `agent-docs/RELIABILITY.md`                         | Reliability invariants, failure modes, and verification matrix.         | `apps/web/lib/server/**`, cache/data flows, workflows          | Web Maintainers           | Per reliability-affecting PR | High        | 2026-02-18    |
| `agent-docs/SECURITY.md`                            | Security trust boundaries, threat model notes, and escalation criteria. | Auth/session flows, API handlers, external integrations        | Web Maintainers           | Per auth/security PR         | High        | 2026-02-25    |
| `agent-docs/PRODUCT_SENSE.md`                       | Product journey constraints and communication norms.                    | Product UX and flow behaviors                                  | Product + Web Maintainers | Monthly                      | Medium      | 2026-02-18    |
| `agent-docs/QUALITY_SCORE.md`                       | Quality posture rubric with evidence and follow-ups.                    | Architecture docs + tests + CI outputs                         | Web Maintainers           | Bi-weekly                    | Medium      | 2026-02-26    |
| `agent-docs/PLANS.md`                               | Plan workflow and storage conventions.                                  | `agent-docs/exec-plans/**`                                     | Web Maintainers           | Per process change           | Medium      | 2026-02-23    |
| `agent-docs/prompts/simplify.md`                    | Reusable simplification pass prompt for behavior-preserving cleanup.    | Agent completion workflow                                      | Web Maintainers           | Per process change           | Medium      | 2026-02-23    |
| `agent-docs/prompts/test-coverage-audit.md`         | Reusable coverage-audit prompt for high-impact regression protection.   | Agent completion workflow                                      | Web Maintainers           | Per process change           | Medium      | 2026-02-23    |
| `agent-docs/prompts/task-finish-review.md`          | Reusable final completion audit prompt for correctness/security review. | Agent completion workflow                                      | Web Maintainers           | Per process change           | Medium      | 2026-02-23    |
| `agent-docs/cobuild-ui-architecture.md`             | Durable UI architecture map for `apps/web`.                             | `apps/web/app/**`, `apps/web/components/**`                    | Web Maintainers           | Per UI architecture PR       | High        | 2026-02-18    |
| `agent-docs/cobuild-ui-components.md`               | Inventory of reusable shared UI components.                             | `apps/web/components/**`                                       | Web Maintainers           | Per component add/remove PR  | High        | 2026-02-18    |
| `agent-docs/data-model-map.md`                      | High-level map of Prisma models and schema groupings.                   | `apps/web/prisma/cobuild.prisma`                               | Web Maintainers           | Per schema/data PR           | High        | 2026-02-24    |
| `agent-docs/libs-utilities-map.md`                  | High-level map of `apps/web/lib/**` modules.                            | `apps/web/lib/**`                                              | Web Maintainers           | Per module-boundary PR       | High        | 2026-02-24    |
| `agent-docs/onchain-abis-and-writes.md`             | ABI generation and onchain write/read plumbing map.                     | `apps/contracts/**`, `apps/web/lib/domains/token/onchain/**`   | Web Maintainers           | Per onchain integration PR   | High        | 2026-02-18    |
| `agent-docs/references/README.md`                   | Internal/external reference packs for implementation details.           | `agent-docs/references/**`                                     | Web Maintainers           | Monthly                      | Medium      | 2026-02-23    |
| `agent-docs/references/module-boundary-map.md`      | Layer ownership and dependency-direction map for `apps/web`.            | `apps/web/app/**`, `apps/web/components/**`, `apps/web/lib/**` | Web Maintainers           | Per architecture-boundary PR | High        | 2026-02-24    |
| `agent-docs/references/app-router-and-data-flow.md` | App router topology + API route + data flow map.                        | `apps/web/app/**`, `apps/web/lib/**`                           | Web Maintainers           | Per route/data-flow PR       | High        | 2026-02-25    |
| `agent-docs/references/auth-wallet-model.md`        | Auth/session/wallet identity model and invariants.                      | `apps/web/lib/domains/auth/**`, auth components/hooks          | Web Maintainers           | Per auth/wallet PR           | High        | 2026-02-25    |
| `agent-docs/references/server-data-cache-map.md`    | Prisma/KV/cache topology and consistency notes.                         | `apps/web/lib/server/**`, `apps/web/lib/domains/**`            | Web Maintainers           | Per data/cache PR            | High        | 2026-03-05    |
| `agent-docs/references/onchain-execution-map.md`    | Onchain read/write execution paths and generated artifacts.             | `apps/contracts/**`, onchain hooks/components                  | Web Maintainers           | Per onchain PR               | High        | 2026-02-25    |
| `agent-docs/references/testing-ci-map.md`           | Verification and CI enforcement map.                                    | `.github/workflows/**`, test scripts, doc scripts              | Web Maintainers           | Per CI/process PR            | Medium      | 2026-02-26    |
| `agent-docs/references/nextjs-llms.txt`             | External Next.js/App Router reference pack.                             | Next.js docs                                                   | Web Maintainers           | Quarterly                    | Low         | 2026-02-18    |
| `agent-docs/references/prisma-llms.txt`             | External Prisma/read-replica reference pack.                            | Prisma docs                                                    | Web Maintainers           | Quarterly                    | Low         | 2026-02-18    |
| `agent-docs/references/wagmi-llms.txt`              | External wagmi/viem/onchain reference pack.                             | Wagmi + Viem docs                                              | Web Maintainers           | Quarterly                    | Low         | 2026-02-18    |
| `agent-docs/generated/README.md`                    | Generated doc artifacts produced by scripts.                            | `agent-docs/generated/**`                                      | Web Maintainers           | Per script change            | Medium      | 2026-02-18    |
| `agent-docs/exec-plans/`                            | Execution plans for active and completed work.                          | PR-linked plan docs                                            | Web Maintainers           | Per multi-file/high-risk PR  | High        | 2026-02-18    |
| `agent-docs/exec-plans/tech-debt-tracker.md`        | Rolling debt register with owner/priority/status.                       | Audits, incidents, reviews                                     | Web Maintainers           | Bi-weekly                    | Medium      | 2026-02-18    |

## Conventions

- Keep AGENTS files short and route-oriented.
- Update this index whenever docs are added, removed, or moved.
- For multi-file/high-risk work, add a plan in `agent-docs/exec-plans/active/`.
- Keep `agent-docs/exec-plans/active/COORDINATION_LEDGER.md` current for active coding tasks.
- Keep active plan entries current for in-flight multi-file/runtime changes.
