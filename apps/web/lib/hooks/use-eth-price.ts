"use client";

import { useQuery } from "@tanstack/react-query";
import { DEFAULT_ETH_PRICE_USDC } from "@/lib/domains/token/onchain/addresses";
import { ETH_PRICE_QUERY_KEY } from "@/lib/hooks/query-keys";

interface EthPriceResponse {
  priceUsdc: number;
}

export async function fetchEthPrice(): Promise<EthPriceResponse> {
  const res = await fetch("/api/eth-price");
  if (!res.ok) {
    return { priceUsdc: DEFAULT_ETH_PRICE_USDC };
  }
  return res.json();
}

/**
 * Hook for fetching current ETH price in USD
 *
 * Provides:
 * - Current ETH price from database (cached, stale-while-revalidate)
 * - USD to ETH conversion utility
 * - Falls back to $3000 if price unavailable
 */
export function useEthPrice() {
  const query = useQuery({
    queryKey: ETH_PRICE_QUERY_KEY,
    queryFn: fetchEthPrice,
    initialData: { priceUsdc: DEFAULT_ETH_PRICE_USDC },
    refetchInterval: 5 * 60 * 1000,
  });

  const ethPriceUsdc = query.data?.priceUsdc ?? DEFAULT_ETH_PRICE_USDC;

  /**
   * Convert USD amount to ETH
   * @param usd - Amount in USD
   * @returns ETH amount as string (suitable for parseEther)
   */
  function usdToEth(usd: number): string {
    const eth = usd / ethPriceUsdc;
    // Return with enough precision for small amounts
    return eth.toFixed(8);
  }

  return {
    ethPriceUsdc,
    usdToEth,
    isLoading: query.isLoading,
  };
}
