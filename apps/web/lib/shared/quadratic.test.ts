import { describe, it, expect } from "vitest";
import {
  calculateQuadraticScore,
  calculateAllQuadraticScores,
  distributeMatchPool,
} from "@/lib/shared/quadratic";

describe("quadratic primitives", () => {
  it("calculates score, backers, and contribution", () => {
    const totals = new Map([
      ["fid:1", 4],
      ["fid:2", 9],
    ]);
    const result = calculateQuadraticScore(totals);
    expect(result.score).toBe((Math.sqrt(4) + Math.sqrt(9)) ** 2);
    expect(result.backers).toBe(2);
    expect(result.contribution).toBe(13);
  });

  it("calculates all scores across casts", () => {
    const aggregations = new Map([
      ["a", { eligibleBackerTotals: new Map([["fid:1", 1]]) }],
      [
        "b",
        {
          eligibleBackerTotals: new Map([
            ["fid:1", 1],
            ["fid:2", 1],
          ]),
        },
      ],
    ]);
    const scores = calculateAllQuadraticScores(aggregations);
    expect(scores.get("a")?.score).toBeCloseTo(1, 6);
    expect(scores.get("b")?.score).toBeCloseTo(4, 6);
  });
});

describe("distributeMatchPool hybrid (CQF + fallback)", () => {
  const POOL = 100;

  it("uses CQF gap when any project is under the QF target", () => {
    const byHash = new Map([
      // gap 5 => should receive entire pool
      ["under", { score: 9, backers: 2, contribution: 4 }],
      // gap 0
      ["balanced", { score: 4, backers: 1, contribution: 4 }],
    ]);

    const { matchByHash, totalScore } = distributeMatchPool(byHash, 2, POOL);
    expect(totalScore).toBe(5);
    expect(matchByHash.get("under")).toBeCloseTo(POOL, 6);
    expect(matchByHash.get("balanced")).toBeCloseTo(0, 6);
  });

  it("falls back to QF score when gaps are zero but scores exist", () => {
    const byHash = new Map([
      ["p1", { score: 100, backers: 1, contribution: 100 }],
      ["p2", { score: 300, backers: 1, contribution: 300 }],
    ]);

    const { matchByHash, totalScore } = distributeMatchPool(byHash, 2, POOL);
    expect(totalScore).toBe(400);
    expect(matchByHash.get("p1")).toBeCloseTo(25, 6);
    expect(matchByHash.get("p2")).toBeCloseTo(75, 6);
  });

  it("even-splits when no gaps and no scores exist", () => {
    const byHash = new Map([
      ["p1", { score: 0, backers: 0, contribution: 0 }],
      ["p2", { score: 0, backers: 0, contribution: 0 }],
      ["p3", { score: 0, backers: 0, contribution: 0 }],
    ]);

    const { matchByHash, totalScore } = distributeMatchPool(byHash, 3, POOL);
    expect(totalScore).toBe(0);
    const expected = POOL / 3;
    expect(matchByHash.get("p1")).toBeCloseTo(expected, 6);
    expect(matchByHash.get("p2")).toBeCloseTo(expected, 6);
    expect(matchByHash.get("p3")).toBeCloseTo(expected, 6);
  });
});
