# Cobuild Site — UI Architecture (apps/web)

## Purpose & Scope

- Focus: reusable UI architecture and component patterns in `apps/web`.
- Excluded: marketing visuals/animations (now grouped under `components/visuals`).
- Keep in sync with `agent-docs/cobuild-ui-components.md`.

## Stack Overview

- Next.js App Router + React.
- Tailwind CSS v4 for styling.
- shadcn/ui primitives in `apps/web/components/ui`.
- AI Elements components in `apps/web/components/ai-elements` (built on shadcn/ui; React 19 + Tailwind v4 aligned).

## High-Level Structure

- App Router segments:
  - `(app)` is the authenticated shell with sidebar layout (`app/(app)/layout.tsx`).
  - `(marketing)` contains landing/token pages; uses shared `Header` + section components.
- Root layout (`app/layout.tsx`):
  - Loads fonts (JetBrains Mono + Public Sans).
  - Applies global theme tokens + `Toaster`.
  - Wraps content with `ThemeProvider` and `AppProviders`.
- Providers:
  - `app/app-providers.tsx` + `app/providers.tsx` set up Privy, Wagmi, and React Query.
  - `ThemeProvider` from `next-themes` drives dark/light mode.

## Component Layers & Imports

- App/feature components live under `apps/web/components/features` and `apps/web/app/**`.
- Shared UI primitives live under `apps/web/components/ui`.
- AI-native building blocks live under `apps/web/components/ai-elements`.
- Layout and shared components live under `apps/web/components/layout` and `apps/web/components/common`.
- Imports:
  - UI primitives: `@/components/ui/<component>`.
  - AI Elements: `@/components/ai-elements/<component>`.

## Styling & Theming

- Tailwind v4 via `@tailwindcss/postcss`; no `tailwind.config` file.
- Tokens live in `app/globals.css` using `@theme inline` + CSS variables.
- Dark mode uses `.dark` overrides and `@custom-variant dark`.
- Utility: `cn` (from `lib/shared/utils.ts`) is the global class merge helper.

## Design System Conventions

- `components/ui/*` is a shadcn-style layer:
  - Radix primitives + `class-variance-authority` (cva).
  - Uses `data-slot` attributes to make styling and slot targeting consistent.
  - `buttonVariants`, input variants, and other variant patterns are standardized.
- When adding UI:
  - Prefer `components/ui` primitives for base controls.
  - Keep new primitives in `components/ui`, domain components elsewhere.
  - Use `data-slot` on custom components that need consistent styling.
- Keep reusable/shared components in `components/common` (or `components/ui` for primitives).
  - Co-locate page-specific components with their route segment under `app/` when they are not reused.

## App Shell / Layout Patterns

- Sidebar system (`components/ui/sidebar.tsx`):
  - `SidebarProvider` stores state in `sidebar_state` cookie; supports desktop + mobile sheet.
  - `SidebarInset` is the main content area that responds to sidebar state.
- App sidebar (`components/layout/app-sidebar.tsx`) wires navigation using `Sidebar*` primitives.

## Auth & Identity UI

- `AuthButton` (`components/ui/auth-button.tsx`) is the default for auth-gated actions (especially onchain).
- `ConnectButton` (`components/features/auth/connect-button.tsx`) + `UserPopover` (`components/layout/user-popover.tsx`) provide the auth entrypoint and account menu.
- `LinkAccountButton` provides reusable Farcaster/X linking UI.

## Data Formatting & Display

- `Currency` for numbers/percentages.
- `DateTime` for absolute/relative timestamps (handles visibility changes).
- Skeletons (`components/common/skeletons` + `ui/skeleton`) for loading states.

## Reuse Guidance (Practical Defaults)

- Buttons/Inputs: `Button`, `Input`, `Textarea`, `Field`.
- Overlays: `Dialog`, `Popover`, `Sheet`, `DropdownMenu`.
- Navigation: `Sidebar` primitives + `Breadcrumb`.
- Filtering/Sorting: `SortToggle`, `TimeRangeFilter`.
- Auth-gated actions: `AuthButton` (per AGENTS rules).
- Notifications: `Toaster` (Sonner wrapper).

## Notes

- AI Elements components are local copies installed via CLI; keep them in sync by re-running the installer when upgrading.
- When adding/removing shared components, update `agent-docs/cobuild-ui-components.md`.

## References

- `components.json` documents shadcn config, aliases, and registry.
- `app/globals.css` is the source of design tokens.
- `lib/shared/utils.ts` defines `cn` for consistent class merging.
