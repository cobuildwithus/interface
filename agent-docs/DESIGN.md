# Design

## Purpose

Define durable design-system constraints for rapid iteration without visual drift.

## Design System Sources

- Root tokens and theme variables: `apps/web/app/globals.css`
- Root layout typography/theme wiring: `apps/web/app/layout.tsx`
- Primitive controls: `apps/web/components/ui/**`
- Reusable composition patterns: `apps/web/components/common/**`, `apps/web/components/layout/**`

## Core Principles

1. Reusable primitives first

- New generic controls belong in `components/ui`.
- Feature-level wrappers belong in `components/features/<domain>`.

2. Route-local by default

- If UI is only used by one route group, co-locate in `app/**`.
- Promote to shared components only after verified reuse.

3. Predictable interaction language

- Success/error feedback should use `sonner` toasts in interactive flows.
- Auth/onchain action affordances should be explicit and guarded.

4. Accessibility baseline

- Keep keyboard and focus behavior intact for dialogs/sheets/popovers.
- Preserve semantic structure and visible state/disabled affordances.

## Visual Consistency Rules

- Keep typography tokens and spacing scale consistent with existing primitives.
- Extend existing variant APIs before adding near-duplicate components.
- Prefer composition over style overrides that bypass primitive contracts.
- Avoid route-specific forks of core primitives unless behavior truly diverges.

## Required Updates When Changing UI Architecture

If you change shared UI structure, update in the same PR:

- `agent-docs/cobuild-ui-architecture.md`
- `agent-docs/cobuild-ui-components.md`
- `agent-docs/FRONTEND.md` (if layering rules change)
