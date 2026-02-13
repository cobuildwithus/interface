import { describe, expect, it } from "vitest";
import { NEYNAR_ELIGIBILITY_MIN_SCORE, isNeynarScoreIneligible } from "./constants";

describe("NEYNAR_ELIGIBILITY_MIN_SCORE", () => {
  it("is set to 0.55", () => {
    expect(NEYNAR_ELIGIBILITY_MIN_SCORE).toBe(0.55);
  });

  it("is a number type", () => {
    expect(typeof NEYNAR_ELIGIBILITY_MIN_SCORE).toBe("number");
  });

  it("is between 0 and 1 (valid score range)", () => {
    expect(NEYNAR_ELIGIBILITY_MIN_SCORE).toBeGreaterThanOrEqual(0);
    expect(NEYNAR_ELIGIBILITY_MIN_SCORE).toBeLessThanOrEqual(1);
  });
});

describe("isNeynarScoreIneligible", () => {
  it("returns true for null score (unknown = ineligible)", () => {
    // null means we don't have score data - treat as ineligible
    expect(isNeynarScoreIneligible(null)).toBe(true);
  });

  it("returns true for score below threshold", () => {
    expect(isNeynarScoreIneligible(0.54)).toBe(true);
    expect(isNeynarScoreIneligible(0.4)).toBe(true);
    expect(isNeynarScoreIneligible(0.1)).toBe(true);
    expect(isNeynarScoreIneligible(0)).toBe(true);
  });

  it("returns false for score at threshold", () => {
    expect(isNeynarScoreIneligible(0.55)).toBe(false);
  });

  it("returns false for score above threshold", () => {
    expect(isNeynarScoreIneligible(0.56)).toBe(false);
    expect(isNeynarScoreIneligible(0.7)).toBe(false);
    expect(isNeynarScoreIneligible(0.9)).toBe(false);
    expect(isNeynarScoreIneligible(1)).toBe(false);
  });

  it("handles boundary cases correctly", () => {
    expect(isNeynarScoreIneligible(0.549999)).toBe(true);
    expect(isNeynarScoreIneligible(0.550001)).toBe(false);
  });
});
