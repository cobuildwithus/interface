# Cobuild Site — Onchain Writes + ABI Map (High Level)

## Purpose

High-level map of where onchain ABIs come from, how write transactions are routed, and where read plumbing lives.

## ABI & Address Sources (single source of truth)

- `apps/contracts/wagmi.config.ts`: wagmi CLI config for fetching ABIs from chain explorers.
- `apps/contracts/addresses.ts`: Base chain ID, contract addresses, constants.
- `apps/contracts/src/generated.ts`: generated ABIs + configs.
- `apps/contracts/package.json`: `generate` script + `postgenerate` copy step.

## Generated ABI Destinations

`pnpm --filter contracts generate` writes ABIs/addresses into:

- `apps/web/lib/domains/token/onchain/abis.ts`
- `apps/web/lib/domains/token/onchain/addresses.ts`

**Implication:** Treat `apps/web/lib/domains/token/onchain/abis.ts` as a generated artifact; edit only upstream in `apps/contracts`.

## Onchain Write System (web)

Primary write transactions funnel through a shared hook:

- `apps/web/lib/domains/token/onchain/use-contract-transaction.ts`
  - wraps `wagmi` `useWriteContract` + `useWaitForTransactionReceipt`
  - handles chain switching, toast lifecycle, error handling, explorer links
  - auth gating via `useLogin` (Privy) and connected wallet state

### Key write flows

- Revnet pay (swap):
  - `apps/web/lib/hooks/use-revnet-pay.ts`
  - used by `apps/web/lib/hooks/use-swap-core.ts`
  - UI: `apps/web/components/features/funding/swap.tsx`
- Cash out:
  - `apps/web/app/(app)/home/cash-out-dialog.tsx`
- Loan + permissions flow (two-step tx):
  - `apps/web/app/(app)/home/loan-dialog.tsx`

### Auth gating for onchain actions

- `apps/web/components/ui/auth-button.tsx` + `apps/web/lib/domains/auth/use-auth-click.ts`
- `apps/web/AGENTS.md`: requires `AuthButton` for onchain actions

## Onchain Read System (web)

Server-side reads

- `apps/web/lib/domains/token/onchain/revnet-data.ts`: cached ruleset + terminal lookup
- `apps/web/lib/domains/token/onchain/project-stats.ts`: cached project stats from DB + price metadata
- `apps/web/lib/domains/token/onchain/eth-price.ts`: cached ETH price from DB with fallback

Client-side reads (wagmi/viem)

- `apps/web/lib/hooks/use-revnet-position.ts`: contract reads for balances, token metadata, cashout
- `apps/web/lib/hooks/use-payment-quote.ts`: quote calcs from revnet data
- `apps/web/lib/domains/token/onchain/clients.ts`: viem public clients
- `apps/web/lib/domains/token/onchain/chains.ts`: RPC + explorer helpers

## Notes & Conventions

- Addresses/constants are shared by contracts/web via generate + copy pipeline.
- Onchain writes should use the shared hook for consistent UX + chain switching.
- Keep explorer links and chain ID logic centralized (see `use-contract-transaction.ts`).
