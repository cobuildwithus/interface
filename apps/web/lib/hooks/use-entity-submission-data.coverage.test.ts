/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import type { IntentStats } from "@/lib/domains/token/intent-stats/intent-stats";
import type { CastEvalScore } from "@/types/farcaster";
import { useEntitySubmissionData } from "@/lib/hooks/use-submission-data-entity";

const swaps = [
  {
    id: "1",
    backerAddress: "0x1",
    reaction: null,
    spendUsdc: 10,
    tokensBought: 1,
    tokenSymbol: "COBUILD",
  },
  {
    id: "2",
    backerAddress: "0x1",
    reaction: null,
    spendUsdc: 5,
    tokensBought: 1,
    tokenSymbol: "COBUILD",
  },
];

describe("useEntitySubmissionData", () => {
  it("aggregates rewards + backers", () => {
    const evalScore: CastEvalScore = { share: 0.5, rank: 1, winRate: 0.9 };
    const intentStats: IntentStats = {
      totalBackersCount: 2,
      backersCount: 1,
      raisedUsdc: 15,
      qfMatchUsd: 0,
    };

    const { result } = renderHook(() => useEntitySubmissionData(evalScore, intentStats, swaps));

    expect(result.current.backersCount).toBe(2);
    expect(result.current.eligibleBackersCount).toBe(1);
    expect(result.current.volume).toBe(15);
    expect(result.current.backers.length).toBe(1);
  });

  it("handles missing intent stats and eval score", () => {
    const { result } = renderHook(() => useEntitySubmissionData(null, null, []));
    expect(result.current.backersCount).toBe(0);
    expect(result.current.eligibleBackersCount).toBe(0);
    expect(result.current.volume).toBe(0);
    expect(result.current.backers).toEqual([]);
  });
});
