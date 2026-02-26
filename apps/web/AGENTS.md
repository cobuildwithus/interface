# apps/web AGENTS Overlay

## Purpose

This file contains web-app-specific overlays for the root `AGENTS.md`.

## Read Order

1. `agent-docs/FRONTEND.md`
2. `agent-docs/DESIGN.md`
3. `agent-docs/product-specs/content-language.md`
4. `agent-docs/references/module-boundary-map.md`
5. `agent-docs/references/app-router-and-data-flow.md`
6. `agent-docs/references/auth-wallet-model.md`
7. `agent-docs/references/onchain-execution-map.md`
8. `agent-docs/cobuild-ui-architecture.md`
9. `agent-docs/cobuild-ui-components.md`

## Hard Rules

- Any module with top-level `"use server"` must export async functions only.
- Do not export runtime values from `"use server"` modules.
- Use `AuthButton` for auth-gated/onchain actions.
- Prefer `sonner` toasts for interactive success/error states.
- Addresses are canonical lowercase; avoid SQL `lower(...)`/`upper(...)` in address joins/filters.
- If shared UI architecture changes, update `agent-docs/cobuild-ui-architecture.md` and `agent-docs/cobuild-ui-components.md`.
- Never access `.env` or `.env*` files.
