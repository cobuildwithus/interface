# Agent notes (apps/web)

## Next.js server actions

- Any module with a top-level `"use server"` directive must **only export async functions**.
- Do **not** export runtime values from `"use server"` modules (e.g. `const`, `let`, `class`, `enum`, objects).
- If you need shared constants/types, move them to a separate non-`"use server"` module and import them.

## Auth buttons

- Use `AuthButton` for action buttons (especially onchain actions) so auth/connect is enforced before proceeding.

## Toasts

- Prefer `sonner` toasts for user-facing errors and success states in interactive UI (avoid inline error blocks).

## Address Casing

- Addresses are stored canonical lowercase. Do not use SQL `lower(...)`/`upper(...)` on address columns in joins/filters; compare columns directly and normalize only at write/input boundaries.

# UI Architecture Docs

- Location: `agent-docs/` at repo root.
- `agent-docs/cobuild-ui-architecture.md`
- `agent-docs/cobuild-ui-components.md`
- If you touch any code referenced in these docs, update the docs simply and cleanly (add/remove/rename entries).

# Agent Guidelines

## Token & Treasury Language

> Content rules, not legal advice. Escalate borderline cases to human + legal.

**Do:**

- Focus on use & participation: govern, access features, route revenue, coordinate
- Use: "participants," "builders," "contributors," "holders"
- Use: "tokens," "participation," "onchain mechanism," "protocol features"
- Use hedged language: "designed to," "intended to," "under normal operation"
- Always include risk caveats: prices can go down, mechanisms can fail, liquidity may not exist

**Don't:**

- Frame tokens as investments or promise returns/upside/profit
- Use: "guaranteed," "risk-free," "can't go down," "only moves up," "safe yield"
- Use equity metaphors: "shares," "dividends," "ownership stake," "profit sharing," "claim on treasury"
- Give trading advice: "how to 10x," "when to exit," "how to de-risk"
- Use yield language: "APY," "APR," "interest-bearing," "savings account," "income stream"
- Label users as "investors" or reference "investment opportunities"
- Overstate redemption: avoid "you can always redeem" or "minimum you can walk away with"

**Escalate (don't answer autonomously):** expected returns, trading strategies, legal claims, or any borderline phrases a$

## Farcaster Branding

- Never use "Warpcast" in user-facing copy—always say "Farcaster" instead
- Warpcast is just one client; we reference the protocol, not a specific app
- Use "Farcaster client" if you need to reference where users compose/view casts

## Env File Access

- Never access '.env' or '.env\*' files under any circumstance. Do not read, list, grep, source, cat, open, or otherwise touch them.
