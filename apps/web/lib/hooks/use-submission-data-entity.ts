"use client";

import { useMemo } from "react";
import type { IntentStats } from "@/lib/domains/token/intent-stats/intent-stats";
import type {
  CastIntentSwap,
  CastBacker,
} from "@/lib/domains/token/intent-swaps/intent-swaps.shared";
import { aggregateBackersFromSwaps } from "@/lib/domains/token/intent-swaps/intent-swaps.shared";
import {
  calculateCobuildAiReward,
  calculateQuadraticReward,
  calculateTotalReward,
} from "@/lib/domains/token/rewards";
import type { CastEvalScore } from "@/types/farcaster";

type EntitySubmissionData = {
  aiReward: { amount: number; pending: boolean };
  quadraticReward: number;
  totalEarnings: number;
  backersCount: number;
  eligibleBackersCount: number;
  volume: number;
  backers: CastBacker[];
};

export function useEntitySubmissionData(
  evalScore: CastEvalScore | null | undefined,
  intentStats: IntentStats | null | undefined,
  swaps: CastIntentSwap[]
): EntitySubmissionData {
  return useMemo(() => {
    const aiReward = calculateCobuildAiReward(evalScore);
    const quadraticReward = calculateQuadraticReward(intentStats ?? null);
    const totalEarnings = calculateTotalReward(evalScore, intentStats ?? null);

    const backersCount = intentStats?.totalBackersCount ?? 0;
    const eligibleBackersCount = intentStats?.backersCount ?? 0;
    const volume = intentStats?.raisedUsdc ?? 0;

    const backers = aggregateBackersFromSwaps(swaps);

    return {
      aiReward,
      quadraticReward,
      totalEarnings,
      backersCount,
      eligibleBackersCount,
      volume,
      backers,
    };
  }, [evalScore, intentStats, swaps]);
}
