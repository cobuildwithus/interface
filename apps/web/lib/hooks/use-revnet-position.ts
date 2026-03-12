"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getRevnetCashOutContext,
  parseEvmAddress,
  quoteRevnetCashOut,
  REVNET_NATIVE_TOKEN,
} from "@cobuild/wire";
import { formatUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { contracts, WETH_ADDRESS } from "@/lib/domains/token/onchain/addresses";
import { REVNET_CHAIN_ID } from "@/lib/domains/token/onchain/revnet";
import { COBUILD_JUICEBOX_PROJECT_ID_BIGINT } from "@/lib/domains/token/juicebox/constants";

const TOKEN_SYMBOL_BY_ADDRESS: Record<string, string> = {
  [contracts.USDCBase.toLowerCase()]: "USDC",
  [WETH_ADDRESS.toLowerCase()]: "WETH",
  [REVNET_NATIVE_TOKEN.toLowerCase()]: "ETH",
};

export const REVNET_POSITION_QUERY_KEY = "revnet-position";
export const REVNET_CASH_OUT_QUOTE_QUERY_KEY = "revnet-cash-out-quote";

export function getRevnetPositionQueryKey(account?: `0x${string}`) {
  return [REVNET_POSITION_QUERY_KEY, account ?? null, contracts.USDCBase] as const;
}

function getBaseTokenSymbol(address?: string) {
  const normalized = parseEvmAddress(address);
  if (!normalized) return "Token";
  return TOKEN_SYMBOL_BY_ADDRESS[normalized] || "Token";
}

export function useRevnetPosition() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: REVNET_CHAIN_ID });
  const contextQuery = useQuery({
    queryKey: getRevnetPositionQueryKey(address),
    enabled: publicClient != null,
    staleTime: 30_000,
    queryFn: async () => {
      if (!publicClient) {
        throw new Error("REVNET public client unavailable.");
      }
      return getRevnetCashOutContext(publicClient, {
        ...(address !== undefined ? { account: address } : {}),
        preferredBaseToken: contracts.USDCBase,
      });
    },
  });

  const context = contextQuery.data;
  const quoteQuery = useQuery({
    queryKey: [
      REVNET_CASH_OUT_QUOTE_QUERY_KEY,
      "position",
      context?.projectId.toString() ?? null,
      context?.quoteTerminal ?? null,
      context?.quoteAccountingContext?.token ?? null,
      context?.quoteAccountingContext?.decimals ?? null,
      context?.quoteAccountingContext?.currency ?? null,
      context ? context.token.balance.toString() : null,
    ],
    enabled:
      publicClient != null &&
      !!context?.quoteTerminal &&
      !!context?.quoteAccountingContext &&
      context.token.balance > 0n,
    staleTime: 30_000,
    queryFn: async () => {
      if (
        !publicClient ||
        !context?.quoteTerminal ||
        !context.quoteAccountingContext ||
        context.token.balance <= 0n
      ) {
        return null;
      }
      try {
        return await quoteRevnetCashOut(publicClient, {
          projectId: context.projectId,
          rawCashOutCount: context.token.balance,
          terminal: context.quoteTerminal,
          accountingContext: context.quoteAccountingContext,
        });
      } catch {
        return null;
      }
    },
  });

  const quote = quoteQuery.data ?? null;
  const projectId = context?.projectId ?? COBUILD_JUICEBOX_PROJECT_ID_BIGINT;
  const tokenDecimals = context?.token.decimals ?? 18;
  const tokenBalance = context?.token.balance ?? 0n;
  const baseTokenContext = context?.selectedAccountingContext ?? undefined;
  const cashOutValue = quote?.netReclaimAmount ?? 0n;

  return {
    projectId,
    projectIdNumber: Number(projectId),
    tokenAddress: context?.token.address ?? undefined,
    tokenSymbol: context?.token.symbol || "Token",
    tokenDecimals,
    tokenBalance,
    formattedBalance: formatUnits(tokenBalance, tokenDecimals),
    baseTokenContext,
    baseTokenAddress: baseTokenContext?.token,
    baseTokenSymbol: getBaseTokenSymbol(baseTokenContext?.token),
    terminalAddress: context?.terminal ?? undefined,
    permissionsAddress: context?.permissionsAddress ?? contracts.JBPermissions,
    revLoansAddress: context?.revLoansAddress ?? contracts.REVLoans,
    cashOutValue,
    formattedCashOutValue:
      baseTokenContext && quote ? formatUnits(cashOutValue, baseTokenContext.decimals) : "0",
    isConnected: !!address,
    account: context?.account ?? parseEvmAddress(address) ?? undefined,
  };
}
