"use client";

import { useMemo } from "react";
import { parseEther } from "viem";
import { getTokenQuote, formatTokenAmount } from "@/lib/domains/token/onchain/quote";
import { useRevnetData } from "./use-revnet-data";
import { COBUILD_PROJECT_ID } from "@/lib/domains/token/onchain/revnet";

/**
 * Hook for calculating payment quotes for the COBUILD revnet
 *
 * Fetches current ruleset from API and calculates
 * how many tokens the user will receive for a given ETH amount.
 */
export function usePaymentQuote(ethAmount: string, projectId: bigint = COBUILD_PROJECT_ID) {
  const { data, isLoading, error } = useRevnetData(projectId);

  const quote = useMemo(() => {
    if (!data || !ethAmount || ethAmount === "0") {
      return null;
    }

    try {
      const ethWei = parseEther(ethAmount);
      return getTokenQuote(ethWei, BigInt(data.weight), data.reservedPercent);
    } catch {
      return null;
    }
  }, [data, ethAmount]);

  const formattedQuote = useMemo(() => {
    if (!quote) {
      return { payerTokens: "0", reservedTokens: "0", totalTokens: "0" };
    }

    return {
      payerTokens: formatTokenAmount(quote.payerTokens),
      reservedTokens: formatTokenAmount(quote.reservedTokens),
      totalTokens: formatTokenAmount(quote.totalTokens),
    };
  }, [quote]);

  return {
    quote,
    formattedQuote,
    weight: data?.weight ? BigInt(data.weight) : undefined,
    reservedPercent: data?.reservedPercent,
    isPaused: data?.isPaused ?? false,
    isLoading,
    error,
  };
}
