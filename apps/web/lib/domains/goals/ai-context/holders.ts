import "server-only";

import { getHoldersHistory } from "@/lib/domains/token/juicebox/holders-history";
import {
  buildWindowStats,
  last,
  mapWindowStats,
  toUsd,
  valueAtOrBefore,
} from "@/lib/domains/goals/ai-context/utils";
import type { HolderStats } from "@/lib/domains/goals/ai-context/types";

export async function getHoldersStats(
  nowMs: number,
  basePriceUsd: number | null
): Promise<HolderStats> {
  const holdersHistory = await getHoldersHistory();
  const holdersData = holdersHistory.data;
  const holdersLast = last(holdersData);
  const holdersTotal = holdersLast?.holders ?? null;
  const holdersAt = buildWindowStats(nowMs, (cutoffMs) => valueAtOrBefore(holdersData, cutoffMs));
  const newHolders = mapWindowStats(holdersAt, (point) => {
    if (holdersTotal === null || point?.holders === undefined) return null;
    return Math.max(0, holdersTotal - point.holders);
  });

  const medianContributionBase = holdersLast?.medianContribution ?? null;

  return {
    total: holdersTotal,
    new: newHolders,
    medianContribution: {
      base: medianContributionBase,
      usd: toUsd(medianContributionBase, basePriceUsd),
    },
  };
}
