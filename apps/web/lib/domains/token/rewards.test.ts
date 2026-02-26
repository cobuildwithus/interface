import { describe, expect, it } from "vitest";
import {
  calculateCobuildAiReward,
  calculateQuadraticReward,
  calculateTotalReward,
  REWARD_POOL_USD,
} from "./rewards";
import type { CastEvalScore } from "@/types/farcaster";
import type { IntentStats } from "@/lib/domains/token/intent-stats/intent-stats";

describe("calculateCobuildAiReward", () => {
  it("returns pending for null evalScore", () => {
    expect(calculateCobuildAiReward(null)).toEqual({ amount: 0, pending: true });
  });

  it("returns pending for undefined evalScore", () => {
    expect(calculateCobuildAiReward(undefined)).toEqual({ amount: 0, pending: true });
  });

  it("calculates reward based on share (half the pool)", () => {
    const evalScore: CastEvalScore = { share: 0.5, rank: 1, winRate: 0.8 };
    expect(calculateCobuildAiReward(evalScore)).toEqual({ amount: 25, pending: false });
  });

  it("rounds to cents", () => {
    const evalScore: CastEvalScore = { share: 0.333333, rank: 2, winRate: 0.6 };
    expect(calculateCobuildAiReward(evalScore)).toEqual({ amount: 16.67, pending: false });
  });

  it("returns pending for non-finite share", () => {
    const evalScore: CastEvalScore = { share: Infinity, rank: 1, winRate: 0.5 };
    expect(calculateCobuildAiReward(evalScore)).toEqual({ amount: 0, pending: true });
  });

  it("returns pending for NaN share", () => {
    const evalScore: CastEvalScore = { share: Number.NaN, rank: 1, winRate: 0.5 };
    expect(calculateCobuildAiReward(evalScore)).toEqual({ amount: 0, pending: true });
  });

  it("returns pending for negative share", () => {
    const evalScore: CastEvalScore = { share: -0.1, rank: 1, winRate: 0.5 };
    expect(calculateCobuildAiReward(evalScore)).toEqual({ amount: 0, pending: true });
  });

  it("returns pending for share greater than one", () => {
    const evalScore: CastEvalScore = { share: 1.01, rank: 1, winRate: 0.5 };
    expect(calculateCobuildAiReward(evalScore)).toEqual({ amount: 0, pending: true });
  });

  it("returns zero amount for zero share", () => {
    const evalScore: CastEvalScore = { share: 0, rank: 1, winRate: 0.5 };
    expect(calculateCobuildAiReward(evalScore)).toEqual({ amount: 0, pending: false });
  });

  it("handles full share correctly", () => {
    const evalScore: CastEvalScore = { share: 1.0, rank: 1, winRate: 1.0 };
    expect(calculateCobuildAiReward(evalScore)).toEqual({
      amount: REWARD_POOL_USD * 0.5,
      pending: false,
    });
  });
});

describe("calculateQuadraticReward", () => {
  it("returns 0 for null intentStats", () => {
    expect(calculateQuadraticReward(null)).toBe(0);
  });

  it("returns 0 for undefined intentStats", () => {
    expect(calculateQuadraticReward(undefined)).toBe(0);
  });

  it("returns qfMatchUsd from intentStats", () => {
    const stats: IntentStats = {
      backersCount: 5,
      totalBackersCount: 5,
      raisedUsdc: 100,
      qfMatchUsd: 12.34,
    };
    expect(calculateQuadraticReward(stats)).toBe(12.34);
  });

  it("floors negative match to zero", () => {
    const stats: IntentStats = {
      backersCount: 1,
      totalBackersCount: 1,
      raisedUsdc: 100,
      qfMatchUsd: -5,
    };
    expect(calculateQuadraticReward(stats)).toBe(0);
  });

  it("returns 0 for NaN match", () => {
    const stats: IntentStats = {
      backersCount: 1,
      totalBackersCount: 1,
      raisedUsdc: 100,
      qfMatchUsd: Number.NaN,
    };
    expect(calculateQuadraticReward(stats)).toBe(0);
  });

  it("rounds small decimals up to cents", () => {
    const stats: IntentStats = {
      backersCount: 2,
      totalBackersCount: 2,
      raisedUsdc: 20,
      qfMatchUsd: 0.005,
    };
    expect(calculateQuadraticReward(stats)).toBe(0.01);
  });

  it("rounds to cents", () => {
    const stats: IntentStats = {
      backersCount: 3,
      totalBackersCount: 3,
      raisedUsdc: 50,
      qfMatchUsd: 8.999,
    };
    expect(calculateQuadraticReward(stats)).toBe(9);
  });
});

describe("calculateTotalReward", () => {
  it("handles fractional share and match rounding together", () => {
    const evalScore: CastEvalScore = { share: 0.333333, rank: 1, winRate: 0.8 };
    // AI: 16.67 + QF: 9 + volume: 100 = 125.67
    const intentStats: IntentStats = {
      backersCount: 5,
      totalBackersCount: 5,
      raisedUsdc: 100,
      qfMatchUsd: 8.999,
    };
    expect(calculateTotalReward(evalScore, intentStats)).toBe(125.67);
  });

  it("combines cobuild AI, quadratic, and volume", () => {
    const evalScore: CastEvalScore = { share: 0.2, rank: 1, winRate: 0.8 };
    // AI: 10 + QF: 10 + volume: 100 = 120
    const intentStats: IntentStats = {
      backersCount: 5,
      totalBackersCount: 5,
      raisedUsdc: 100,
      qfMatchUsd: 10,
    };
    expect(calculateTotalReward(evalScore, intentStats)).toBe(120);
  });

  it("returns only cobuild AI when no intent stats", () => {
    const evalScore: CastEvalScore = { share: 0.5, rank: 1, winRate: 0.8 };
    expect(calculateTotalReward(evalScore, null)).toBe(25);
  });

  it("returns quadratic plus volume when no eval score", () => {
    // QF: 15 + volume: 100 = 115
    const intentStats: IntentStats = {
      backersCount: 5,
      totalBackersCount: 5,
      raisedUsdc: 100,
      qfMatchUsd: 15,
    };
    expect(calculateTotalReward(null, intentStats)).toBe(115);
  });

  it("returns 0 when both are null", () => {
    expect(calculateTotalReward(null, null)).toBe(0);
  });
});
