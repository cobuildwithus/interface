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

## Surface Modes

### Marketing / branded surfaces

- Treat the first viewport as one composition, not a dashboard.
- Make the brand or product unmistakable without relying on nav copy alone.
- Default to one dominant visual idea, one headline, one short supporting sentence, and one CTA group above the fold.
- Avoid hero cards, stat strips, chip clusters, floating badges, and secondary promos in the first viewport unless the brief explicitly requires them.
- Use a real visual anchor when imagery is part of the page; decorative gradients alone do not count.
- Keep sections narrative and sequential: identity, support, detail/proof, final CTA.

### Product / app surfaces

- Default to utility copy over campaign copy.
- Start with the working surface itself: task context, status, actions, and current data.
- Prefer layout hierarchy over card mosaics; a card is only justified when it is the interaction container.
- Keep one dominant action color and a calm surface hierarchy unless the existing route already establishes a stronger system.

## Frontend Working Model

Before visually led implementation, write and align on three short decisions:

- `visual thesis`: the mood, material, and visual energy
- `content plan`: the sequence of sections or working areas
- `interaction thesis`: 2-3 motions or interaction details that change the feel of the page

If the route already has an established design language, preserve it and use the working model only to sharpen hierarchy and reduce clutter.

## Copy And Motion

- Write product language, not design commentary.
- Give each section one job: explain, prove, deepen, or convert.
- For product UI, headings should orient the user immediately; if a heading sounds like homepage copy, rewrite it.
- Motion should create hierarchy or presence, not noise. Default to a small number of deliberate transitions rather than many micro-effects.
- Fixed and floating elements must stay out of the way of primary content across common screen sizes.

## Required Updates When Changing UI Architecture

If you change shared UI structure, update in the same PR:

- `agent-docs/cobuild-ui-architecture.md`
- `agent-docs/cobuild-ui-components.md`
- `agent-docs/FRONTEND.md` (if layering rules change)
