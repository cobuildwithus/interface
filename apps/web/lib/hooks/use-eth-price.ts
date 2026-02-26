"use client";

import useSWR from "swr";
import { DEFAULT_ETH_PRICE_USDC } from "@/lib/domains/token/onchain/addresses";

interface EthPriceResponse {
  priceUsdc: number;
}

async function fetchEthPrice(): Promise<EthPriceResponse> {
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
  const { data, isLoading } = useSWR("eth-price", fetchEthPrice, {
    refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    fallbackData: { priceUsdc: DEFAULT_ETH_PRICE_USDC },
  });

  const ethPriceUsdc = data?.priceUsdc ?? DEFAULT_ETH_PRICE_USDC;

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
    isLoading,
  };
}
