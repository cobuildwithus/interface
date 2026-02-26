import "server-only";

import prisma from "@/lib/server/db/cobuild-db-client";
import type { ProjectInfo } from "@/lib/domains/token/juicebox/project";
import { fromBaseUnits } from "@/lib/shared/numbers";
import { JB_TOKEN_DECIMALS } from "@/lib/domains/token/onchain/revnet";
import {
  buildWindowStats,
  mapWindowStats,
  median,
  splitWindow,
  toUsd,
} from "@/lib/domains/goals/ai-context/utils";
import type { MintStats } from "@/lib/domains/goals/ai-context/types";

type MintEvent = {
  timestampMs: number;
  payer: string;
  mintedTokens: number;
  priceBase: number | null;
};

function buildMintWindowStats(events: MintEvent[], basePriceUsd: number | null) {
  const uniqueMinters = new Set(events.map((event) => event.payer)).size;
  const medianPriceBase = median(events.map((event) => event.priceBase ?? Number.NaN));
  const medianSizeTokens = median(events.map((event) => event.mintedTokens));

  return {
    count: events.length,
    uniqueMinters,
    medianPrice: {
      basePerToken: medianPriceBase,
      usdPerToken: toUsd(medianPriceBase, basePriceUsd),
    },
    medianSize: { tokens: medianSizeTokens },
  };
}

export async function getMintStats(
  project: ProjectInfo,
  nowMs: number,
  basePriceUsd: number | null
): Promise<MintStats> {
  const mintEvents: MintEvent[] = project.suckerGroupId
    ? (
        await prisma.juiceboxPayEvent.findMany({
          select: {
            timestamp: true,
            payer: true,
            amount: true,
            effectiveTokenCount: true,
          },
          where: {
            suckerGroupId: project.suckerGroupId,
            effectiveTokenCount: { gt: 0 },
          },
          orderBy: { timestamp: "asc" },
        })
      ).map((payment) => {
        const amountBase = fromBaseUnits(payment.amount, project.accountingDecimals);
        const mintedTokens = fromBaseUnits(payment.effectiveTokenCount, JB_TOKEN_DECIMALS);
        const priceBase = mintedTokens > 0 ? amountBase / mintedTokens : null;
        return {
          timestampMs: payment.timestamp * 1000,
          payer: payment.payer.toLowerCase(),
          mintedTokens,
          priceBase,
        };
      })
    : [];

  const mintEventsByWindow = buildWindowStats(nowMs, (cutoffMs) =>
    splitWindow(mintEvents, (event) => event.timestampMs, cutoffMs)
  );
  const mintStatsByWindow = mapWindowStats(mintEventsByWindow, (events) =>
    buildMintWindowStats(events, basePriceUsd)
  );

  return {
    count: mapWindowStats(mintStatsByWindow, (stats) => stats.count),
    uniqueMinters: mapWindowStats(mintStatsByWindow, (stats) => stats.uniqueMinters),
    medianPrice: mapWindowStats(mintStatsByWindow, (stats) => stats.medianPrice),
    medianSize: mapWindowStats(mintStatsByWindow, (stats) => stats.medianSize),
  };
}
