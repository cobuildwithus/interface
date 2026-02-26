# Cobuild Site — UI Components (Inventory)

## Scope & Exclusions

- Inventory covers reusable UI components in `apps/web/components`.
- Excluded by request: marketing visuals/animations (now grouped under `components/visuals`).
- Page-specific components should be colocated with their route under `app/` and are not listed here.

## Shared UI primitives (shadcn-based)

Location: `apps/web/components/ui`

- `alert.tsx` — Alert primitive.
- `auth-button.tsx` — Button wrapper enforcing auth/connect before action.
- `avatar.tsx` — Profile avatar with image + fallback.
- `badge.tsx` — Badge/pill primitive.
- `breadcrumb.tsx` — Breadcrumb primitives (list, item, separator, ellipsis).
- `button-group.tsx` — Grouped button container + separator + text slot.
- `button.tsx` — Base Button with variants + sizes.
- `calendar.tsx` — DayPicker wrapper w/ Tailwind styling.
- `card.tsx` — Card layout primitive.
- `carousel.tsx` — Carousel wrapper.
- `collapsible.tsx` — Collapsible primitives.
- `command.tsx` — Command palette primitives.
- `copy-to-clipboard.tsx` — Inline copy button with “Copied” state.
- `currency.tsx` — Currency/percent formatter view.
- `date-time.tsx` — Time display with relative mode + auto refresh.
- `dialog.tsx` — Dialog primitives (overlay, content, header, etc.).
- `drawer.tsx` — Drawer primitives.
- `dropdown-menu.tsx` — Dropdown primitives (Radix-based).
- `field.tsx` — Form field layout system (Field/Group/Legend/Error/etc.).
- `grid-background.tsx` — Subtle grid background overlay.
- `hover-card.tsx` — HoverCard primitives.
- `image-dropzone.tsx` — Image dropzone input.
- `input-group.tsx` — Input grouping/layout helpers.
- `input.tsx` — Text input w/ variants (default/amount).
- `label.tsx` — Label primitive.
- `markdown.tsx` — Markdown renderer.
- `navigation-menu.tsx` — Navigation menu primitives.
- `neynar-score-indicator.tsx` — Amber dot indicator + tooltip.
- `orbit-rotation.tsx` — Orbiting icon layout helper (non-marketing reuse).
- `pagination.tsx` — Pagination controls.
- `popover.tsx` — Popover primitives.
- `progress-bar.tsx` — Animated progress bar with gradient.
- `progress.tsx` — Progress primitive.
- `scroll-area.tsx` — Scroll area primitives.
- `select.tsx` — Select primitives.
- `separator.tsx` — Divider line.
- `sheet.tsx` — Sheet (drawer) primitives.
- `sidebar.tsx` — Sidebar system: provider, layouts, groups, triggers.
- `skeleton.tsx` — Skeleton loading block.
- `sonner.tsx` — Toast wrapper (Sonner) w/ theme mapping.
- `sort-toggle.tsx` — Simple segmented toggle for sort.
- `switch.tsx` — Switch control.
- `textarea.tsx` — Textarea primitive.
- `chat-input.tsx` — Chat input wrapper.
- `chat-input/*` — Chat input subcomponents (attachments, action bar, helpers).
- `time-range-filter.tsx` — Range selector + helper filter.
- `tooltip.tsx` — Tooltip primitives.

## AI Elements components

Location: `apps/web/components/ai-elements`

- `artifact.tsx`
- `canvas.tsx`
- `chain-of-thought.tsx`
- `checkpoint.tsx`
- `code-block.tsx`
- `confirmation.tsx`
- `connection.tsx`
- `context.tsx`
- `controls.tsx`
- `conversation.tsx`
- `edge.tsx`
- `image.tsx`
- `inline-citation.tsx`
- `loader.tsx`
- `message.tsx`
- `model-selector.tsx`
- `node.tsx`
- `open-in-chat.tsx`
- `panel.tsx`
- `plan.tsx`
- `queue.tsx`
- `reasoning.tsx`
- `shimmer.tsx`
- `sources.tsx`
- `suggestion.tsx`
- `task.tsx`
- `tool.tsx`
- `toolbar.tsx`
- `web-preview.tsx`

## Layout & Shell

Location: `apps/web/components/layout`

- `app-sidebar.tsx` — Main nav, built on Sidebar primitives.
- `header.tsx` — Marketing/app header bar (also used on token page).
- `page-header.tsx` — Page header layout.
- `user-popover.tsx` — Account menu popover.
- `sidebar/large-menu-item.tsx` — Large nav row for sidebar.
- `sidebar/sidebar-user-menu.tsx` — Sidebar account menu.

## Common shared components

Location: `apps/web/components/common`

- `date-time-picker.tsx` — Combined calendar + time input.
- `glossary-term.tsx` — Inline glossary definition.
- `image-dialog.tsx` — Full-screen image lightbox + `useImageDialog` hook.
- `not-found-home-button.tsx` — 404 home CTA.
- `socials.tsx` — Social icon row (X/Farcaster/Discord/GitHub).
- `user-profile.tsx` — Server profile loader + render prop.
- `user-profile-client.tsx` — Client profile loader + render prop.
- `icons/*` — SVG icon components.
- `charts/*` — Chart helpers (Raf mounting, Recharts wrappers, types).
- `skeletons/*` — Shared loading skeletons.

## Visuals (marketing + diagrams)

Location: `apps/web/components/visuals`

- `capital-flow-diagram/*` — Funding/treasury flow diagram.
- `capital-orbit/*` — Orbit visualization.
- `dao-flow-diagram/*` — PixiJS flow simulation for marketing.
- `flywheel/*` — Flywheel diagrams + simulation visuals.
- `launchpad-orbit.tsx` — Orbit marketing graphic.

## Feature/Domain Components

Location: `apps/web/components/features`

### `features/auth`

- `connect-button.tsx` — Privy auth entrypoint button.
- `farcaster-link-actions.tsx` — Actions for Farcaster linking.
- `wallet-identity-guard.tsx` — Wallet identity gating.
- `link-account-button/*` — Link account buttons + config/types.
- `farcaster/*` — Farcaster link dialog + Neynar auth UI.

### `features/chat`

- `chat-client.tsx` — Chat client wrapper.
- `goal-chats-client.tsx` — Goal chat client.
- `chat-client/*` — Chat body, message list, hooks, etc.

### `features/goals`

- `goal-card.tsx`, `goal-progress-card.tsx`, `goal-treasury-card.tsx` — Goal summaries.
- `goal-ai-input*.tsx` — Goal AI input components.
- `contribute-dialog.tsx` — Contribution flow.
- `goal-action-cards/*` — Action cards + data/patterns.
- `million-member-goal*.tsx` — Server/client wrappers for milestone display.

### `features/rounds`

- `round-submission-drawer/*` — Boost swap, backers list, earnings breakdown.
- `submission/*` — Submission stats and helpers.
- `moderation/*` — Moderation/flagging UI.
- `submission-card.tsx` — Standard submission list item.
- `post-card-skeleton.tsx` — Submission list skeletons.
- `max-posts-per-user-input.tsx` — Increment/decrement numeric input.
- `toggle-button-group.tsx` — Toggle list + preset options.

### `features/funding`

- `swap.tsx`, `swap-dialog.tsx` — Swap UI and confirm flow.
- `confirm-swap-dialog/*` — Confirm swap dialog + budget options.
- `allowance-stepper/*` — Allowance management flow.
- `amount-input.tsx`, `fund-with-coinbase.tsx`, `add-more-funds.tsx` — Funding helpers.
- `onramp/*` — Onramp status UI.
- `wallet-qr.tsx` — Wallet QR helper.

### `features/social`

- `discussion/*` — Discussion list components.
- `discussion/activity-cards.tsx` — Shared activity card/empty state UI.
- `discussion/profile-activity-section.tsx` — Shared profile/cast activity lists (top topics + recent replies).
- `events/*` — Events cards + lists.
- `social-post/*` — Post author/content.
- `cast-composer/*` — Composer drawer + helpers.

### `features/token`

- `hero.tsx`, `stats.tsx`, `buy-section.tsx`, `launchpad-section.tsx`.
- `builder-funding-section.tsx`, `split-diagram/*`, `faq.tsx`, `footer.tsx`.
- `token-badge.tsx` — ETH/COBUILD badges + swap arrow.
- `recent-activity-table.tsx` — Recent swaps + pending intents table.

### `features/settings`

- `settings-card.tsx` — Settings card base.
- `connected-accounts-card.tsx`, `connected-accounts-actions.tsx`.
- `wallet-qr-card.tsx`, `wallet-switch-card.tsx`.

## Notes

- Import UI primitives from `@/components/ui/*`.
- Import AI Elements from `@/components/ai-elements/*`.
- Feature components live under `@/components/features/*`.
- Layout components live under `@/components/layout/*`.
- Common shared components live under `@/components/common/*`.
- Visuals/diagrams live under `@/components/visuals/*`.
