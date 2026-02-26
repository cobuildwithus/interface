import "server-only";

import { getIssuanceTerms } from "@/lib/domains/token/juicebox/issuance-terms";
import { issuancePriceFromWeight, toUsd } from "@/lib/domains/goals/ai-context/utils";
import type { IssuanceStats } from "@/lib/domains/goals/ai-context/types";

export type IssuanceSnapshot = {
  tokenSymbol: string;
  stats: IssuanceStats;
};

export async function getIssuanceStats(basePriceUsd: number | null): Promise<IssuanceSnapshot> {
  const issuanceTerms = await getIssuanceTerms();

  const currentPriceBase = issuancePriceFromWeight(issuanceTerms.summary.currentIssuance);
  const nextPriceBase = issuancePriceFromWeight(issuanceTerms.summary.nextIssuance);

  const stats: IssuanceStats = {
    currentPrice: {
      basePerToken: currentPriceBase,
      usdPerToken: toUsd(currentPriceBase, basePriceUsd),
    },
    nextPrice: {
      basePerToken: nextPriceBase,
      usdPerToken: toUsd(nextPriceBase, basePriceUsd),
    },
    nextChangeAt: issuanceTerms.summary.nextChangeAt,
    nextChangeType: issuanceTerms.summary.nextChangeType,
    activeStage: issuanceTerms.summary.activeStage,
    nextStage: issuanceTerms.summary.nextStage,
    reservedPercent: issuanceTerms.summary.reservedPercent,
    cashOutTaxRate:
      issuanceTerms.activeStageIndex !== null
        ? (issuanceTerms.stages[issuanceTerms.activeStageIndex]?.cashOutTaxRate ?? null)
        : null,
  };

  return { tokenSymbol: issuanceTerms.tokenSymbol, stats };
}
