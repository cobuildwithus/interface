import "server-only";

import prisma from "@/lib/server/db/cobuild-db-client";
import { unstable_cache } from "next/cache";
import { getEthPriceUsdc } from "@/lib/domains/token/onchain/eth-price";
import { BASE_CHAIN_ID, WETH_ADDRESS } from "@/lib/domains/token/onchain/addresses";
import { NATIVE_TOKEN } from "@/lib/domains/token/onchain/revnet";

async function fetchBaseAssetPriceUsd(accountingToken: string): Promise<number | null> {
  const tokenLower = accountingToken.toLowerCase();
  if (tokenLower === NATIVE_TOKEN.toLowerCase() || tokenLower === WETH_ADDRESS.toLowerCase()) {
    return getEthPriceUsdc();
  }

  const tokenMetadata = await prisma.tokenMetadata.findUnique({
    where: {
      chainId_address: {
        chainId: BASE_CHAIN_ID,
        address: tokenLower,
      },
    },
    select: { priceUsdc: true },
  });

  return tokenMetadata?.priceUsdc ? Number(tokenMetadata.priceUsdc) : null;
}

export const getBaseAssetPriceUsd = unstable_cache(
  (accountingToken: string) => fetchBaseAssetPriceUsd(accountingToken),
  ["goal-ai-context-base-asset-price"],
  { revalidate: 3600 }
);
