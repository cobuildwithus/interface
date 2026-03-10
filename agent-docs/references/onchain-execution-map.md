# Onchain Execution Map

## ABI and Address Pipeline

1. ABI/address sources are maintained in `apps/contracts/**`.
2. Generation sync writes artifacts into web onchain modules.
3. Web reads generated artifacts from:

- `lib/domains/token/onchain/abis.ts`
- `lib/domains/token/onchain/addresses.ts`

## Client Write Path

1. UI entrypoint in funding/onchain feature components.
2. `useSwapCore` handles amount/quote/input state.
3. `useRevnetPay` builds transaction call args.
4. `useContractTransaction` prepares wallet/chain and executes `writeContract`.
5. Transaction lifecycle (loading/success/error/explorer links) is normalized in one place.

## Key Files

- `apps/web/lib/domains/token/onchain/abis.ts`
- `apps/web/lib/domains/token/onchain/addresses.ts`
- `apps/web/lib/domains/token/onchain/use-contract-transaction.ts`
- `apps/web/lib/hooks/use-swap-core.ts`
- `apps/web/lib/hooks/use-revnet-pay.ts`
- `apps/web/components/features/funding/**`

## Client/Server Read Paths

- Client reads: wagmi/viem hooks and quote helpers.
- Server cached reads: revnet/project stats/ETH price helpers.
- Server writes (cli API):
  - `app/api/cli/exec/route.ts` via CDP smart-account user operations (`transfer` / `sendUserOperation` + `waitForUserOperation`), scoped to Base mainnet only. Stored/default network aliases are normalized to `base`, but explicit exec requests reject `base-sepolia`.
  - `app/api/cli/farcaster/signup/route.ts` via CDP smart-account user operations on `optimism` for Farcaster `IdGateway.register` and `KeyGateway.add`, including smart-account EIP-712 typed-data signing for SignedKeyRequest metadata.

## Auth and Wallet Gating

- Onchain action buttons should use `AuthButton`.
- Wallet/chain readiness is enforced in transaction helper flow.

## Critical Invariants

1. Onchain writes should route through shared transaction helpers for chain and error normalization.
2. Auth-gated onchain actions should enforce session and wallet readiness before write calls.
3. ABI/address artifacts are generated sources and must stay in sync with `apps/contracts/**`.
4. Address handling remains canonical lowercase across read and write paths.

## Update Rule

If onchain write orchestration or ABI/address generation flow changes, update this file and `agent-docs/onchain-abis-and-writes.md`.
