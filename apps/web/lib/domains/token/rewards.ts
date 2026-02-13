import type { CastEvalScore } from "@/types/farcaster";
import type { IntentStats } from "@/lib/domains/token/intent-stats/intent-stats";
import { roundToCents } from "@/lib/shared/numbers";
import { REWARDS, AI_DUELS_POOL_USD } from "@/lib/config/rewards";

export const REWARD_POOL_USD = REWARDS.TOTAL_POOL_USD;

export function calculateCobuildAiReward(evalScore: CastEvalScore | null | undefined): {
  amount: number;
  pending: boolean;
} {
  if (!evalScore) return { amount: 0, pending: true };
  const share = evalScore.share;
  if (typeof share !== "number" || !Number.isFinite(share) || share < 0 || share > 1) {
    return { amount: 0, pending: true };
  }
  return { amount: roundToCents(AI_DUELS_POOL_USD * share), pending: false };
}

function safeAmount(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value) || value < 0) return 0;
  return roundToCents(value);
}

export function calculateQuadraticReward(intentStats: IntentStats | null | undefined): number {
  return safeAmount(intentStats?.qfMatchUsd);
}

export function calculateTotalReward(
  evalScore: CastEvalScore | null | undefined,
  intentStats: IntentStats | null | undefined
): number {
  const cobuildAi = calculateCobuildAiReward(evalScore);
  const quadratic = safeAmount(intentStats?.qfMatchUsd);
  const volume = safeAmount(intentStats?.raisedUsdc);
  return roundToCents(cobuildAi.amount + quadratic + volume);
}
