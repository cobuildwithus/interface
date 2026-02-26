import "server-only";

import { unstable_cache } from "next/cache";
import { getProject } from "@/lib/domains/token/juicebox/project";
import { JB_TOKEN_DECIMALS } from "@/lib/domains/token/onchain/revnet";
import { buildGoalAiContextPrompt } from "@/lib/domains/goals/ai-context/prompt";
import { getBaseAssetPriceUsd } from "@/lib/domains/goals/ai-context/base-asset";
import { getTreasuryStats } from "@/lib/domains/goals/ai-context/treasury";
import { getIssuanceStats } from "@/lib/domains/goals/ai-context/issuance";
import { getMintStats } from "@/lib/domains/goals/ai-context/mints";
import { getHoldersStats } from "@/lib/domains/goals/ai-context/holders";
import { getDistributionStats } from "@/lib/domains/goals/ai-context/distribution";
import type {
  GoalAiContextData,
  GoalAiContextResponse,
} from "@/lib/domains/goals/ai-context/types";

export type { GoalAiContextResponse } from "@/lib/domains/goals/ai-context/types";

async function fetchCobuildAiContext(): Promise<GoalAiContextResponse> {
  const nowMs = Date.now();
  const project = await getProject();
  const basePriceUsd = await getBaseAssetPriceUsd(project.accountingToken);

  const [treasury, issuanceSnapshot, mints, holders, distribution] = await Promise.all([
    getTreasuryStats(nowMs, basePriceUsd),
    getIssuanceStats(basePriceUsd),
    getMintStats(project, nowMs, basePriceUsd),
    getHoldersStats(nowMs, basePriceUsd),
    getDistributionStats(),
  ]);

  const data: GoalAiContextData = {
    baseAsset: {
      symbol: project.accountingTokenSymbol,
      decimals: project.accountingDecimals,
      priceUsd: basePriceUsd,
    },
    token: {
      symbol: issuanceSnapshot.tokenSymbol,
      decimals: JB_TOKEN_DECIMALS,
    },
    treasury,
    issuance: issuanceSnapshot.stats,
    mints,
    holders,
    distribution,
  };

  const endpoint = "/api/cobuild/ai-context";
  const prompt = buildGoalAiContextPrompt({ endpoint });

  return {
    goalAddress: "",
    asOf: new Date(nowMs).toISOString(),
    asOfMs: nowMs,
    prompt,
    data,
  };
}

export const getCobuildAiContext = unstable_cache(
  fetchCobuildAiContext,
  ["cobuild-ai-context-v1"],
  {
    revalidate: 900,
  }
);
