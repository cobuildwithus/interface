# Module Boundary Map

## Core Application Boundaries

### Route composition boundary

- Paths: `apps/web/app/**`
- Responsibility: route topology, page/layout composition, API handlers, server action entrypoints.
- Rule: keep route files focused on orchestration and view composition, not deep domain persistence logic.

### Shared component boundary

- Paths: `apps/web/components/ui/**`, `apps/web/components/common/**`, `apps/web/components/layout/**`
- Responsibility: reusable UI primitives, design-system-aligned components, shell-level presentation.
- Rule: shared components should not import server-only modules or own cross-domain side effects.

### Feature component boundary

- Paths: `apps/web/components/features/**`
- Responsibility: feature-specific presentation + user interaction flows.
- Rule: delegate business logic to `lib/domains/**` and persistence/integrations to server/domain layers.

### Domain logic boundary

- Paths: `apps/web/lib/domains/**`
- Responsibility: domain behavior, value shaping, onchain/read logic, and feature-specific rules.
- Rule: domain modules may depend on integrations/shared utilities; they should not depend on route files.

### Integration boundary

- Paths: `apps/web/lib/integrations/**`
- Responsibility: third-party API clients, transport adapters, SDK wrappers.
- Rule: normalize external error/data semantics before exposing them to domain and route layers.

### Server infrastructure boundary

- Paths: `apps/web/lib/server/**`
- Responsibility: DB clients, KV/cache adapters, privileged side effects, server-only execution.
- Rule: never import server modules into client components; keep read/write consistency choices explicit.
- Example privileged path: `apps/web/lib/server/build-bot/**` for PAT auth and CDP wallet execution.

### Shared utility boundary

- Paths: `apps/web/lib/shared/**`
- Responsibility: pure helpers and common utility functions with no runtime side effects.
- Rule: keep helpers deterministic and environment-agnostic.

### Contracts artifact boundary

- Paths: `apps/contracts/**`, `apps/web/lib/domains/token/onchain/{abis,addresses}.ts`
- Responsibility: ABI/address generation and synced web-consumable artifacts.
- Rule: generated artifacts are source-of-truth outputs; do not hand-edit synced ABI/address data.

## Dependency Direction Rules

1. `app/**` may import from `components/**`, `lib/domains/**`, `lib/server/**`, `lib/shared/**`.
2. `components/features/**` may import from `components/ui/**`, `lib/domains/**`, and `lib/shared/**`.
3. `components/ui/**` must not import from `components/features/**` or `lib/server/**`.
4. `lib/domains/**` may import from `lib/integrations/**`, `lib/server/**` (server-only contexts), and `lib/shared/**`.
5. `lib/server/**` may import from `lib/shared/**` and DB/integration dependencies, but never from client-only UI modules.
6. `lib/shared/**` should not import from route, component, domain, or server implementation layers.

## Cross-Cutting Invariants

1. One wallet maps to one active identity across UI, auth hooks, and server session projection.
2. Onchain writes flow through shared transaction helpers for consistent chain gating and error handling.
3. External input boundaries (API routes, integrations) validate and normalize payloads before use.
4. Cache and DB flows preserve explicit consistency posture (primary-safe reads where correctness requires it).

## Update Rule

If import boundaries or dependency directions change, update this file with the same PR and sync `agent-docs/FRONTEND.md` or `ARCHITECTURE.md` as needed.
