import "server-only";

import { unstable_cache } from "next/cache";
import prisma from "@/lib/server/db/cobuild-db-client";
import { BASE_CHAIN_ID, WETH_ADDRESS, contracts } from "./addresses";
import { COBUILD_PROJECT_ID } from "./revnet";
import { Prisma } from "@/generated/prisma/client";

interface ProjectStats {
  priceUsdc: number | null;
  treasuryUsdc: number | null;
  holdersCount: number;
}

const WEI_PER_ETH = 1e18;

async function fetchProjectStats(): Promise<ProjectStats> {
  const [project, tokenMetadata, wethMetadata] = await Promise.all([
    prisma.juiceboxProject.findUnique({
      where: {
        chainId_projectId: {
          chainId: BASE_CHAIN_ID,
          projectId: Number(COBUILD_PROJECT_ID),
        },
      },
      select: {
        balance: true,
        contributorsCount: true,
      },
    }),
    prisma.tokenMetadata.findUnique({
      where: {
        chainId_address: {
          chainId: BASE_CHAIN_ID,
          address: contracts.CobuildToken.toLowerCase(),
        },
      },
      select: {
        priceUsdc: true,
      },
    }),
    prisma.tokenMetadata.findUnique({
      where: {
        chainId_address: {
          chainId: BASE_CHAIN_ID,
          address: WETH_ADDRESS,
        },
      },
      select: {
        priceUsdc: true,
      },
    }),
  ]);

  const balanceNum =
    project?.balance instanceof Prisma.Decimal
      ? project.balance.toNumber()
      : Number(project?.balance ?? 0);

  const treasuryEth = balanceNum / WEI_PER_ETH;
  const ethPriceUsdc = wethMetadata?.priceUsdc ? Number(wethMetadata.priceUsdc) : null;

  return {
    priceUsdc: tokenMetadata?.priceUsdc ? Number(tokenMetadata.priceUsdc) : null,
    treasuryUsdc: ethPriceUsdc !== null ? treasuryEth * ethPriceUsdc : null,
    holdersCount: project?.contributorsCount ?? 0,
  };
}

export const getProjectStats = unstable_cache(fetchProjectStats, ["cobuild-project-stats"], {
  revalidate: 300,
});
