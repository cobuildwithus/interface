import { describe, expect, it } from "vitest";

import { computeRankTier, toSafeCount } from "./rank";

describe("profile rank helpers", () => {
  it("coerces counts safely", () => {
    expect(toSafeCount(null)).toBe(0);
    expect(toSafeCount(undefined)).toBe(0);
    expect(toSafeCount(-3)).toBe(0);
    expect(toSafeCount(4.9)).toBe(4);
    expect(toSafeCount(Infinity)).toBe(0);
  });

  it("computes tiers with neynar bonus", () => {
    expect(computeRankTier(0, 0).name).toBe("Brand New");
    expect(computeRankTier(1, 0).name).toBe("Newbie");
    expect(computeRankTier(10, 1).name).toBe("Jr. Member");
  });

  it("clamps neynar score and skips bonus when activity is high", () => {
    expect(computeRankTier(5, 2).name).toBe("Jr. Member");
    expect(computeRankTier(14, -1).name).toBe("Newbie");
    expect(computeRankTier(20, 0.5).name).toBe("Jr. Member");
    expect(computeRankTier(400, null).name).toBe("Legendary");
  });
});
