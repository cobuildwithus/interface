import "server-only";

import { unstable_cache } from "next/cache";
import prisma from "@/lib/server/db/cobuild-db-client";
import { BASE_CHAIN_ID, WETH_ADDRESS, DEFAULT_ETH_PRICE_USDC } from "./addresses";

/**
 * Fetches current ETH price in USDC from database
 * Returns default fallback if unavailable
 */
async function fetchEthPriceUsdc(): Promise<number> {
  try {
    const wethMetadata = await prisma.tokenMetadata.findUnique({
      where: {
        chainId_address: {
          chainId: BASE_CHAIN_ID,
          address: WETH_ADDRESS,
        },
      },
      select: {
        priceUsdc: true,
      },
    });

    return wethMetadata?.priceUsdc ? Number(wethMetadata.priceUsdc) : DEFAULT_ETH_PRICE_USDC;
  } catch {
    return DEFAULT_ETH_PRICE_USDC;
  }
}

/**
 * Cached ETH price fetcher (5 minute cache)
 */
export const getEthPriceUsdc = unstable_cache(fetchEthPriceUsdc, ["eth-price-usdc"], {
  revalidate: 300,
});
