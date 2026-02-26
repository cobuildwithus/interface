import "server-only";

import { unstable_cache } from "next/cache";
import { getSupplyBalanceHistory } from "@/lib/domains/token/juicebox/issuance-supply-balance-history";
import { getParticipants } from "@/lib/domains/token/juicebox/participants";
import { JB_TOKEN_DECIMALS } from "@/lib/domains/token/onchain/revnet";
import { last, sum } from "@/lib/domains/goals/ai-context/utils";
import { toFiniteNumber } from "@/lib/shared/numbers";
import type { DistributionStats } from "@/lib/domains/goals/ai-context/types";

async function fetchDistributionStats(): Promise<DistributionStats> {
  const [supplyHistory, participantsPage] = await Promise.all([
    getSupplyBalanceHistory(),
    getParticipants(10, 0, "top"),
  ]);

  const supplyTotal = last(supplyHistory.data)?.totalSupply ?? null;

  const topBalances = participantsPage.items
    .map((participant) => toFiniteNumber(participant.balance))
    .filter((value): value is number => value !== null);
  const topBalancesTokens =
    topBalances.length > 0
      ? topBalances.map((value) => value / Math.pow(10, JB_TOKEN_DECIMALS))
      : [];

  const top10Tokens = sum(topBalancesTokens);
  const top1Tokens = topBalancesTokens.length > 0 ? topBalancesTokens[0]! : null;
  const top10Share =
    supplyTotal !== null && top10Tokens !== null && supplyTotal > 0
      ? top10Tokens / supplyTotal
      : null;
  const top1Share =
    supplyTotal !== null && top1Tokens !== null && supplyTotal > 0
      ? top1Tokens / supplyTotal
      : null;

  return {
    totalSupply: supplyTotal,
    top10Tokens,
    top1Tokens,
    top10Share,
    top1Share,
  };
}

export const getDistributionStats = unstable_cache(
  fetchDistributionStats,
  ["goal-ai-context-distribution-v1"],
  { revalidate: 3600 }
);
