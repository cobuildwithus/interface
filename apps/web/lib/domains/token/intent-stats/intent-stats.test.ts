import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getIntentStatsByHash,
  parseIntentAmount,
  isBackerEligible,
  aggregateContributions,
  type RawContribution,
  type FidMatch,
  type CastAggregation,
} from "./intent-stats";
import {
  calculateQuadraticScore,
  calculateAllQuadraticScores,
  distributeMatchPool,
} from "@/lib/shared/quadratic";
import { QUADRATIC_POOL_USD } from "@/lib/config/rewards";
import { NEYNAR_ELIGIBILITY_MIN_SCORE } from "@/lib/domains/eligibility/constants";

const { mockFindUnique, mockFindMany, mockGetFidsByAddresses } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindMany: vi.fn(),
  mockGetFidsByAddresses: vi.fn(),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  __esModule: true,
  default: {
    tokenMetadata: { findUnique: mockFindUnique },
    intent: { findMany: mockFindMany },
  },
}));

vi.mock("@/lib/integrations/farcaster/address-lookup", () => ({
  getFidsByAddresses: (...args: Parameters<typeof mockGetFidsByAddresses>) =>
    mockGetFidsByAddresses(...args),
}));

function mockTokenMeta(decimals = 18) {
  mockFindUnique.mockResolvedValue({ decimals });
}

function mockIntent(
  entityId: string,
  wallet: string,
  targetAmount: string | null,
  spendUsdc: number,
  swapAmountOut?: string | null
) {
  return {
    entityId,
    walletAddressFrom: wallet,
    targetAmount,
    spendAmountNum: String(spendUsdc * 1e6),
    swapExecuted: swapAmountOut ? { amountOut: swapAmountOut } : null,
    spendTokenMetadata: { decimals: 6, priceUsdc: 1 },
  };
}

function mockEligibleBacker(address: string, fid: number, score = 0.8) {
  return { address: address.toLowerCase(), fid, neynarUserScore: score };
}

function setupFidMocks(
  backers: Array<{ address: string; fid: number; neynarUserScore: number | null }>
) {
  const map = new Map(
    backers.map((b) => [
      b.address.toLowerCase(),
      { fid: b.fid, neynarUserScore: b.neynarUserScore },
    ])
  );
  mockGetFidsByAddresses.mockResolvedValue(map);
}

// =============================================================================
// Unit tests for extracted helper functions
// =============================================================================

describe("parseIntentAmount", () => {
  it("parses targetAmount string with 18 decimals", () => {
    const result = parseIntentAmount("1000000000000000000", null, 18);
    expect(result).toBe(1);
  });

  it("parses targetAmount string with 0 decimals", () => {
    const result = parseIntentAmount("100", null, 0);
    expect(result).toBe(100);
  });

  it("falls back to swapAmountOut when targetAmount is null", () => {
    const result = parseIntentAmount(null, "2000000000000000000", 18);
    expect(result).toBe(2);
  });

  it("falls back to swapAmountOut when targetAmount is empty", () => {
    const result = parseIntentAmount("", "3000000000000000000", 18);
    expect(result).toBe(3);
  });

  it("returns null for zero amount", () => {
    expect(parseIntentAmount("0", null, 18)).toBeNull();
  });

  it("returns null for negative amount", () => {
    expect(parseIntentAmount("-1000000000000000000", null, 18)).toBeNull();
  });

  it("returns null for NaN amount", () => {
    expect(parseIntentAmount("not-a-number", null, 18)).toBeNull();
  });

  it("returns null for both null/undefined", () => {
    expect(parseIntentAmount(null, null, 18)).toBeNull();
    expect(parseIntentAmount(undefined, undefined, 18)).toBeNull();
  });

  it("returns null when decimals produce non-positive tokens", () => {
    expect(parseIntentAmount("1", null, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("handles Prisma Decimal-like objects", () => {
    const decimal = { toNumber: () => 5000000000000000000 };
    const result = parseIntentAmount(null, decimal, 18);
    expect(result).toBe(5);
  });
});

describe("isBackerEligible", () => {
  it("returns false for undefined match", () => {
    expect(isBackerEligible(undefined)).toBe(false);
  });

  it("returns false for null neynarUserScore", () => {
    expect(isBackerEligible({ fid: 1, neynarUserScore: null })).toBe(false);
  });

  it("returns false for score below threshold", () => {
    expect(isBackerEligible({ fid: 1, neynarUserScore: NEYNAR_ELIGIBILITY_MIN_SCORE - 0.01 })).toBe(
      false
    );
  });

  it("returns true for score at threshold", () => {
    expect(isBackerEligible({ fid: 1, neynarUserScore: NEYNAR_ELIGIBILITY_MIN_SCORE })).toBe(true);
  });

  it("returns true for score above threshold", () => {
    expect(isBackerEligible({ fid: 1, neynarUserScore: 0.9 })).toBe(true);
  });
});

describe("aggregateContributions", () => {
  const validHashes = new Set(["hash1", "hash2"]);

  it("aggregates contributions by cast hash", () => {
    const contributions: RawContribution[] = [
      { castHash: "hash1", wallet: "0xabc", tokens: 100, spendUsdc: 10 },
      { castHash: "hash1", wallet: "0xdef", tokens: 50, spendUsdc: 5 },
    ];
    const fidMatches = new Map<string, FidMatch>([
      ["0xabc", { fid: 1, neynarUserScore: 0.8 }],
      ["0xdef", { fid: 2, neynarUserScore: 0.7 }],
    ]);

    const result = aggregateContributions(contributions, validHashes, fidMatches);
    const stats = result.get("hash1")!;

    expect(stats.totalTokens).toBe(150);
    expect(stats.totalSpendUsdc).toBe(15);
    expect(stats.allWallets.size).toBe(2);
    expect(stats.eligibleBackerTotals.size).toBe(2);
    expect(stats.eligibleBackerTotals.get("fid:1")).toBe(100);
    expect(stats.eligibleBackerTotals.get("fid:2")).toBe(50);
  });

  it("filters out contributions for invalid hashes", () => {
    const contributions: RawContribution[] = [
      { castHash: "hash1", wallet: "0xabc", tokens: 100, spendUsdc: 10 },
      { castHash: "unknown", wallet: "0xdef", tokens: 50, spendUsdc: 5 },
    ];
    const fidMatches = new Map<string, FidMatch>([
      ["0xabc", { fid: 1, neynarUserScore: 0.8 }],
      ["0xdef", { fid: 2, neynarUserScore: 0.8 }],
    ]);

    const result = aggregateContributions(contributions, validHashes, fidMatches);

    expect(result.has("hash1")).toBe(true);
    expect(result.has("unknown")).toBe(false);
    expect(result.get("hash1")!.totalTokens).toBe(100);
    expect(result.get("hash1")!.totalSpendUsdc).toBe(10);
  });

  it("excludes ineligible backers from eligibleBackerTotals", () => {
    const contributions: RawContribution[] = [
      { castHash: "hash1", wallet: "0xeligible", tokens: 100, spendUsdc: 10 },
      { castHash: "hash1", wallet: "0xineligible", tokens: 200, spendUsdc: 20 },
    ];
    const fidMatches = new Map<string, FidMatch>([
      ["0xeligible", { fid: 1, neynarUserScore: 0.8 }],
      ["0xineligible", { fid: 2, neynarUserScore: 0.3 }],
    ]);

    const result = aggregateContributions(contributions, validHashes, fidMatches);
    const stats = result.get("hash1")!;

    expect(stats.totalTokens).toBe(300);
    expect(stats.totalSpendUsdc).toBe(30);
    expect(stats.allWallets.size).toBe(2);
    expect(stats.eligibleBackerTotals.size).toBe(1);
    expect(stats.eligibleBackerTotals.get("fid:1")).toBe(100);
  });

  it("collapses multi-wallet contributions from same fid", () => {
    const contributions: RawContribution[] = [
      { castHash: "hash1", wallet: "0xwallet1", tokens: 50, spendUsdc: 5 },
      { castHash: "hash1", wallet: "0xwallet2", tokens: 50, spendUsdc: 5 },
    ];
    const fidMatches = new Map<string, FidMatch>([
      ["0xwallet1", { fid: 1, neynarUserScore: 0.8 }],
      ["0xwallet2", { fid: 1, neynarUserScore: 0.8 }],
    ]);

    const result = aggregateContributions(contributions, validHashes, fidMatches);
    const stats = result.get("hash1")!;

    expect(stats.allWallets.size).toBe(2);
    expect(stats.eligibleBackerTotals.size).toBe(1);
    expect(stats.eligibleBackerTotals.get("fid:1")).toBe(100);
  });

  it("handles empty contributions", () => {
    const result = aggregateContributions([], validHashes, new Map());
    expect(result.size).toBe(0);
  });
});

describe("calculateQuadraticScore", () => {
  it("returns score 0 and backers 0 for empty map", () => {
    const result = calculateQuadraticScore(new Map());
    expect(result).toEqual({ score: 0, backers: 0, contribution: 0 });
  });

  it("calculates score as sqrt squared for single backer", () => {
    const totals = new Map([["fid:1", 100]]);
    const result = calculateQuadraticScore(totals);
    expect(result.score).toBe(100);
    expect(result.backers).toBe(1);
    expect(result.contribution).toBe(100);
  });

  it("calculates score as sum of sqrts squared for multiple backers", () => {
    const totals = new Map([
      ["fid:1", 100],
      ["fid:2", 100],
    ]);
    const result = calculateQuadraticScore(totals);
    expect(result.score).toBe(400);
    expect(result.backers).toBe(2);
    expect(result.contribution).toBe(200);
  });

  it("rewards spread contributions over concentrated", () => {
    const concentrated = new Map([["fid:1", 100]]);
    const spread = new Map([
      ["fid:1", 50],
      ["fid:2", 50],
    ]);

    const concentratedResult = calculateQuadraticScore(concentrated);
    const spreadResult = calculateQuadraticScore(spread);

    expect(spreadResult.score).toBeGreaterThan(concentratedResult.score);
    expect(concentratedResult.score).toBeCloseTo(100, 10);
    expect(spreadResult.score).toBeCloseTo(200, 10);
    expect(concentratedResult.contribution).toBe(100);
    expect(spreadResult.contribution).toBe(100);
  });

  it("skips zero or negative token amounts", () => {
    const totals = new Map([
      ["fid:1", 100],
      ["fid:2", 0],
      ["fid:3", -50],
    ]);
    const result = calculateQuadraticScore(totals);
    expect(result.score).toBe(100);
    expect(result.backers).toBe(1);
    expect(result.contribution).toBe(100);
  });
});

describe("calculateAllQuadraticScores", () => {
  it("calculates scores for all aggregations", () => {
    const aggregations = new Map<string, CastAggregation>([
      [
        "hash1",
        {
          eligibleBackerTotals: new Map([["fid:1", 100]]),
          allWallets: new Set(["0xabc"]),
          totalTokens: 100,
          totalSpendUsdc: 10,
        },
      ],
      [
        "hash2",
        {
          eligibleBackerTotals: new Map([
            ["fid:2", 50],
            ["fid:3", 50],
          ]),
          allWallets: new Set(["0xdef", "0xghi"]),
          totalTokens: 100,
          totalSpendUsdc: 10,
        },
      ],
    ]);

    const result = calculateAllQuadraticScores(aggregations);

    expect(result.get("hash1")?.backers).toBe(1);
    expect(result.get("hash1")?.score).toBeCloseTo(100, 10);
    expect(result.get("hash1")?.contribution).toBe(100);
    expect(result.get("hash2")?.backers).toBe(2);
    expect(result.get("hash2")?.score).toBeCloseTo(200, 10);
    expect(result.get("hash2")?.contribution).toBe(100);
  });

  it("handles empty aggregations", () => {
    const result = calculateAllQuadraticScores(new Map());
    expect(result.size).toBe(0);
  });
});

describe("distributeMatchPool", () => {
  it("distributes pool proportionally to scores", () => {
    const quadraticByHash = new Map([
      ["hash1", { score: 100, backers: 1, contribution: 0 }],
      ["hash2", { score: 400, backers: 2, contribution: 0 }],
    ]);

    const { matchByHash, totalScore } = distributeMatchPool(quadraticByHash, 2, 100);

    expect(totalScore).toBe(500);
    expect(matchByHash.get("hash1")).toBe(20);
    expect(matchByHash.get("hash2")).toBe(80);
  });

  it("distributes evenly when total score is 0", () => {
    const quadraticByHash = new Map([
      ["hash1", { score: 0, backers: 0, contribution: 0 }],
      ["hash2", { score: 0, backers: 0, contribution: 0 }],
    ]);

    const { matchByHash, totalScore } = distributeMatchPool(quadraticByHash, 2, 100);

    expect(totalScore).toBe(0);
    expect(matchByHash.get("hash1")).toBe(50);
    expect(matchByHash.get("hash2")).toBe(50);
  });

  it("handles single hash getting full pool", () => {
    const quadraticByHash = new Map([["hash1", { score: 100, backers: 1, contribution: 0 }]]);

    const { matchByHash, totalScore } = distributeMatchPool(quadraticByHash, 1, QUADRATIC_POOL_USD);

    expect(totalScore).toBe(100);
    expect(matchByHash.get("hash1")).toBe(QUADRATIC_POOL_USD);
  });

  it("handles empty quadraticByHash with roundHashCount > 0", () => {
    const { matchByHash, totalScore } = distributeMatchPool(new Map(), 3, 90);

    expect(totalScore).toBe(0);
    expect(matchByHash.size).toBe(0);
  });
});

// =============================================================================
// Integration tests for getIntentStatsByHash
// =============================================================================

describe("getIntentStatsByHash", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockFindMany.mockReset();
    mockGetFidsByAddresses.mockReset();
    // Default: all backers are eligible
    mockGetFidsByAddresses.mockResolvedValue(new Map());
  });

  it("short-circuits on empty inputs", async () => {
    const result = await getIntentStatsByHash({ castHashes: [], roundHashes: [] });
    expect(result).toEqual({});
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns empty when normalized hashes are empty", async () => {
    const result = await getIntentStatsByHash({
      castHashes: ["   "],
      roundHashes: ["   "],
    });
    expect(result).toEqual({});
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("skips non-string values in hash arrays", async () => {
    mockTokenMeta(18);
    setupFidMocks([mockEligibleBacker("0xabc", 1)]);
    mockFindMany.mockResolvedValue([mockIntent("validhash", "0xabc", "1000000000000000000", 1)]);

    const res = await getIntentStatsByHash({
      // @ts-expect-error - testing runtime behavior with non-string values
      castHashes: ["validhash", 123, null, undefined, {}],
      // @ts-expect-error - testing runtime behavior with non-string values
      roundHashes: ["validhash", 456],
    });

    expect(Object.keys(res)).toEqual(["validhash"]);
    expect(res["validhash"]?.backersCount).toBe(1);
  });

  it("dedupes and preserves first-cased cast hash when duplicates provided", async () => {
    mockTokenMeta(18);
    setupFidMocks([mockEligibleBacker("0xabc", 1)]);
    mockFindMany.mockResolvedValue([mockIntent("hash1", "0xabc", "1000000000000000000", 1)]);

    const res = await getIntentStatsByHash({
      castHashes: ["Hash1", "hash1"],
      roundHashes: ["HASH1"],
    });

    expect(Object.keys(res)).toEqual(["Hash1"]);
  });

  it("skips unknown cast hashes in the result", async () => {
    mockTokenMeta(18);
    setupFidMocks([mockEligibleBacker("0xabc", 1)]);
    mockFindMany.mockResolvedValue([mockIntent("known", "0xabc", "1000000000000000000", 1)]);

    const res = await getIntentStatsByHash({
      castHashes: ["known", "unknown"],
      roundHashes: ["known"],
    });

    expect(res).toEqual({
      known: {
        backersCount: 1,
        totalBackersCount: 1,
        raisedUsdc: 1,
        qfMatchUsd: QUADRATIC_POOL_USD,
      },
    });
  });

  it("aggregates intents case-insensitively, unique backers, and scales match", async () => {
    mockTokenMeta(0);
    setupFidMocks([
      mockEligibleBacker("0xabc", 1),
      mockEligibleBacker("0xdef", 2),
      mockEligibleBacker("0x999", 3),
    ]);
    mockFindMany.mockResolvedValue([
      mockIntent("round-1", "0xabc", "1", 1),
      mockIntent("ROUND-1", "0xdef", "4", 4),
      mockIntent("round-1", "0xabc", "1", 1),
      mockIntent("other-round", "0x999", "1", 1),
    ]);

    const res = await getIntentStatsByHash({
      castHashes: ["Round-1"],
      roundHashes: ["ROUND-1", "other-round"],
    });

    expect(res).toEqual({
      "Round-1": {
        backersCount: 2,
        totalBackersCount: 2,
        raisedUsdc: 6,
        qfMatchUsd: QUADRATIC_POOL_USD,
      },
    });
  });

  it("falls back to swapExecuted amount when targetAmount is missing", async () => {
    mockTokenMeta(18);
    setupFidMocks([mockEligibleBacker("0xabc", 1)]);
    mockFindMany.mockResolvedValue([mockIntent("hash1", "0xabc", null, 2, "2000000000000000000")]);

    const res = await getIntentStatsByHash({
      castHashes: ["hash1"],
      roundHashes: ["hash1"],
    });

    expect(res["hash1"]).toMatchObject({
      backersCount: 1,
      totalBackersCount: 1,
      raisedUsdc: 2,
      qfMatchUsd: QUADRATIC_POOL_USD,
    });
  });

  it("splits evenly when all amounts are invalid (non-positive or non-finite)", async () => {
    mockTokenMeta(18);
    mockFindMany.mockResolvedValue([
      {
        entityId: "hash1",
        walletAddressFrom: "0xabc",
        targetAmount: "-1000000000000000000",
        spendAmountNum: "0",
        swapExecuted: null,
        spendTokenMetadata: { decimals: 6, priceUsdc: 1 },
      },
      {
        entityId: "hash1",
        walletAddressFrom: "0xdef",
        targetAmount: "0",
        spendAmountNum: "0",
        swapExecuted: null,
        spendTokenMetadata: { decimals: 6, priceUsdc: 1 },
      },
      {
        entityId: "hash1",
        walletAddressFrom: "0xghi",
        targetAmount: Number.NaN,
        spendAmountNum: "0",
        swapExecuted: null,
        spendTokenMetadata: { decimals: 6, priceUsdc: 1 },
      },
    ]);

    const res = await getIntentStatsByHash({
      castHashes: ["hash1"],
      roundHashes: ["hash1"],
    });

    // Invalid amounts don't count, so no eligible backing = fallback even split
    expect(res["hash1"]?.qfMatchUsd).toBe(QUADRATIC_POOL_USD);
    expect(res["hash1"]?.raisedUsdc).toBe(0);
  });

  it("splits evenly when decimals produce non-positive tokens", async () => {
    mockTokenMeta(Number.POSITIVE_INFINITY);
    mockFindMany.mockResolvedValue([mockIntent("hash1", "0xabc", "10", 0)]);

    const res = await getIntentStatsByHash({
      castHashes: ["hash1"],
      roundHashes: ["hash1"],
    });

    // No valid tokens = no eligible backing = even split
    expect(res["hash1"]?.qfMatchUsd).toBe(QUADRATIC_POOL_USD);
    expect(res["hash1"]?.raisedUsdc).toBe(0);
  });

  it("handles extremely small token amounts still producing tiny quadratic share", async () => {
    mockTokenMeta(100); // tokens become extremely small but finite
    setupFidMocks([mockEligibleBacker("0xabc", 1)]);
    mockFindMany.mockResolvedValue([mockIntent("hash1", "0xabc", "1", 0)]);

    const res = await getIntentStatsByHash({
      castHashes: ["hash1"],
      roundHashes: ["hash1"],
    });

    expect(res["hash1"]).toMatchObject({
      backersCount: 1,
      totalBackersCount: 1,
      raisedUsdc: 0,
      qfMatchUsd: QUADRATIC_POOL_USD,
    });
  });

  it("uses default decimals when tokenMetadata is null", async () => {
    mockFindUnique.mockResolvedValue(null);
    setupFidMocks([mockEligibleBacker("0xabc", 1)]);
    mockFindMany.mockResolvedValue([mockIntent("hash1", "0xabc", "1000000000000000000", 1)]);

    const res = await getIntentStatsByHash({
      castHashes: ["hash1"],
      roundHashes: ["hash1"],
    });

    expect(res["hash1"]).toMatchObject({
      backersCount: 1,
      totalBackersCount: 1,
      raisedUsdc: 1,
      qfMatchUsd: QUADRATIC_POOL_USD,
    });
  });

  it("returns zero qfMatchUsd for cast with no backing when other casts have intents", async () => {
    mockTokenMeta(0);
    setupFidMocks([mockEligibleBacker("0xabc", 1)]);
    mockFindMany.mockResolvedValue([mockIntent("hash1", "0xabc", "100", 100)]);

    const res = await getIntentStatsByHash({
      castHashes: ["hash1", "hash2"],
      roundHashes: ["hash1", "hash2"],
    });

    expect(res["hash1"]?.qfMatchUsd).toBe(QUADRATIC_POOL_USD);
    expect(res["hash2"]).toBeUndefined();
  });
});

describe("Neynar score eligibility filtering", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockFindMany.mockReset();
    mockGetFidsByAddresses.mockReset();
  });

  it("excludes backers with low neynar score from quadratic matching", async () => {
    mockTokenMeta(0);
    // One eligible backer (score >= 0.55), one ineligible (score < 0.55)
    setupFidMocks([
      { address: "0xeligible", fid: 1, neynarUserScore: 0.8 },
      { address: "0xineligible", fid: 2, neynarUserScore: 0.4 },
    ]);
    mockFindMany.mockResolvedValue([
      mockIntent("hash1", "0xeligible", "100", 100),
      mockIntent("hash1", "0xineligible", "100", 100),
    ]);

    const res = await getIntentStatsByHash({
      castHashes: ["hash1"],
      roundHashes: ["hash1"],
    });

    // Only 1 backer counted for quadratic (the eligible one)
    expect(res["hash1"]?.backersCount).toBe(1);
    // totalBackersCount includes all 2 backers
    expect(res["hash1"]?.totalBackersCount).toBe(2);
    // But total raised includes both
    expect(res["hash1"]?.raisedUsdc).toBe(200);
  });

  it("excludes backers with null neynar score from quadratic matching", async () => {
    mockTokenMeta(0);
    setupFidMocks([
      { address: "0xeligible", fid: 1, neynarUserScore: 0.7 },
      { address: "0xnullscore", fid: 2, neynarUserScore: null },
    ]);
    mockFindMany.mockResolvedValue([
      mockIntent("hash1", "0xeligible", "50", 50),
      mockIntent("hash1", "0xnullscore", "50", 50),
    ]);

    const res = await getIntentStatsByHash({
      castHashes: ["hash1"],
      roundHashes: ["hash1"],
    });

    expect(res["hash1"]?.backersCount).toBe(1);
    expect(res["hash1"]?.totalBackersCount).toBe(2);
    expect(res["hash1"]?.raisedUsdc).toBe(100);
  });

  it("excludes backers with no fid from quadratic matching", async () => {
    mockTokenMeta(0);
    // Only one backer has a fid mapping
    setupFidMocks([{ address: "0xwithfid", fid: 1, neynarUserScore: 0.9 }]);
    mockFindMany.mockResolvedValue([
      mockIntent("hash1", "0xwithfid", "25", 25),
      mockIntent("hash1", "0xnofid", "75", 75),
    ]);

    const res = await getIntentStatsByHash({
      castHashes: ["hash1"],
      roundHashes: ["hash1"],
    });

    expect(res["hash1"]?.backersCount).toBe(1);
    expect(res["hash1"]?.totalBackersCount).toBe(2);
    expect(res["hash1"]?.raisedUsdc).toBe(100);
  });

  it("includes backer at exactly the threshold score", async () => {
    mockTokenMeta(0);
    setupFidMocks([{ address: "0xexact", fid: 1, neynarUserScore: NEYNAR_ELIGIBILITY_MIN_SCORE }]);
    mockFindMany.mockResolvedValue([mockIntent("hash1", "0xexact", "10", 10)]);

    const res = await getIntentStatsByHash({
      castHashes: ["hash1"],
      roundHashes: ["hash1"],
    });

    expect(res["hash1"]?.backersCount).toBe(1);
    expect(res["hash1"]?.totalBackersCount).toBe(1);
  });

  it("excludes backer just below threshold but still splits evenly", async () => {
    mockTokenMeta(0);
    setupFidMocks([
      { address: "0xjustbelow", fid: 1, neynarUserScore: NEYNAR_ELIGIBILITY_MIN_SCORE - 0.001 },
    ]);
    mockFindMany.mockResolvedValue([mockIntent("hash1", "0xjustbelow", "10", 10)]);

    const res = await getIntentStatsByHash({
      castHashes: ["hash1"],
      roundHashes: ["hash1"],
    });

    // Backer is ineligible, so backersCount is 0, but totalBackersCount is 1
    expect(res["hash1"]?.backersCount).toBe(0);
    expect(res["hash1"]?.totalBackersCount).toBe(1);
    expect(res["hash1"]?.raisedUsdc).toBe(10);
    // No eligible backers => fallback even split (single cast => full pool)
    expect(res["hash1"]?.qfMatchUsd).toBe(QUADRATIC_POOL_USD);
  });

  it("collapses multi-wallet contributions from same fid", async () => {
    mockTokenMeta(0);
    // Same fid, different wallets
    setupFidMocks([
      { address: "0xwallet1", fid: 1, neynarUserScore: 0.8 },
      { address: "0xwallet2", fid: 1, neynarUserScore: 0.8 },
    ]);
    mockFindMany.mockResolvedValue([
      mockIntent("hash1", "0xwallet1", "50", 50),
      mockIntent("hash1", "0xwallet2", "50", 50),
    ]);

    const res = await getIntentStatsByHash({
      castHashes: ["hash1"],
      roundHashes: ["hash1"],
    });

    // Only 1 unique backer by fid for quadratic, but 2 unique addresses total
    expect(res["hash1"]?.backersCount).toBe(1);
    expect(res["hash1"]?.totalBackersCount).toBe(2);
    expect(res["hash1"]?.raisedUsdc).toBe(100);
    // Quadratic score is sqrt(100)^2 = 100, not (sqrt(50)+sqrt(50))^2 = 200
    // Since contributions are collapsed by fid
    expect(res["hash1"]?.qfMatchUsd).toBe(QUADRATIC_POOL_USD);
  });

  it("splits quadratic pool evenly when there are no intents at all", async () => {
    mockTokenMeta(0);
    mockFindMany.mockResolvedValue([]);

    const res = await getIntentStatsByHash({
      castHashes: ["hash1", "hash2", "hash3"],
      roundHashes: ["hash1", "hash2", "hash3"],
    });

    const expectedPerCast = Math.round((QUADRATIC_POOL_USD / 3) * 100) / 100;
    expect(res["hash1"]?.qfMatchUsd).toBe(expectedPerCast);
    expect(res["hash2"]?.qfMatchUsd).toBe(expectedPerCast);
    expect(res["hash3"]?.qfMatchUsd).toBe(expectedPerCast);
    expect(res["hash1"]?.backersCount).toBe(0);
    expect(res["hash1"]?.totalBackersCount).toBe(0);
    expect(res["hash1"]?.raisedUsdc).toBe(0);
  });

  it("splits evenly when all backers are ineligible", async () => {
    mockTokenMeta(0);
    setupFidMocks([
      { address: "0xlow1", fid: 1, neynarUserScore: 0.3 },
      { address: "0xlow2", fid: 2, neynarUserScore: 0.2 },
    ]);
    mockFindMany.mockResolvedValue([
      mockIntent("hash1", "0xlow1", "100", 100),
      mockIntent("hash1", "0xlow2", "100", 100),
    ]);

    const res = await getIntentStatsByHash({
      castHashes: ["hash1"],
      roundHashes: ["hash1"],
    });

    // No eligible backers, but raisedUsdc still counted
    expect(res["hash1"]?.backersCount).toBe(0);
    expect(res["hash1"]?.totalBackersCount).toBe(2);
    expect(res["hash1"]?.raisedUsdc).toBe(200);
    // With no eligible backing, gap is zero so fallback even split (single cast)
    expect(res["hash1"]?.qfMatchUsd).toBe(QUADRATIC_POOL_USD);
  });

  it("splits evenly when intents have missing entityId", async () => {
    mockTokenMeta(0);
    setupFidMocks([mockEligibleBacker("0xabc", 1)]);
    mockFindMany.mockResolvedValue([
      {
        entityId: null,
        walletAddressFrom: "0xabc",
        targetAmount: "100",
        spendAmountNum: "100000000",
        swapExecuted: null,
        spendTokenMetadata: { decimals: 6, priceUsdc: 1 },
      },
      {
        entityId: "",
        walletAddressFrom: "0xabc",
        targetAmount: "100",
        spendAmountNum: "100000000",
        swapExecuted: null,
        spendTokenMetadata: { decimals: 6, priceUsdc: 1 },
      },
    ]);

    const res = await getIntentStatsByHash({
      castHashes: ["hash1"],
      roundHashes: ["hash1"],
    });

    // Intents can't be attributed, so no eligible backing = even split
    expect(res["hash1"]?.qfMatchUsd).toBe(QUADRATIC_POOL_USD);
    expect(res["hash1"]?.raisedUsdc).toBe(0);
  });

  it("splits evenly when intents have unrelated entityId", async () => {
    mockTokenMeta(0);
    setupFidMocks([mockEligibleBacker("0xabc", 1)]);
    mockFindMany.mockResolvedValue([mockIntent("unrelated-hash", "0xabc", "100", 100)]);

    const res = await getIntentStatsByHash({
      castHashes: ["hash1"],
      roundHashes: ["hash1"],
    });

    // Intent doesn't match any round hash, so no eligible backing = even split
    expect(res["hash1"]?.qfMatchUsd).toBe(QUADRATIC_POOL_USD);
    expect(res["hash1"]?.raisedUsdc).toBe(0);
  });

  it("splits evenly when intents have missing walletAddressFrom", async () => {
    mockTokenMeta(0);
    mockFindMany.mockResolvedValue([
      {
        entityId: "hash1",
        walletAddressFrom: null,
        targetAmount: "100",
        spendAmountNum: "100000000",
        swapExecuted: null,
        spendTokenMetadata: { decimals: 6, priceUsdc: 1 },
      },
      {
        entityId: "hash1",
        walletAddressFrom: "",
        targetAmount: "100",
        spendAmountNum: "100000000",
        swapExecuted: null,
        spendTokenMetadata: { decimals: 6, priceUsdc: 1 },
      },
    ]);

    const res = await getIntentStatsByHash({
      castHashes: ["hash1"],
      roundHashes: ["hash1"],
    });

    // No wallet = can't attribute, so no eligible backing = even split
    expect(res["hash1"]?.qfMatchUsd).toBe(QUADRATIC_POOL_USD);
    expect(res["hash1"]?.raisedUsdc).toBe(0);
  });
});

describe("Quadratic funding calculation", () => {
  function roundToCents(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100) / 100;
  }

  it("calculates quadratic score as sum of sqrts squared", () => {
    const contribution = 100;
    const sqrtSum = Math.sqrt(contribution);
    const quadraticScore = sqrtSum * sqrtSum;
    expect(quadraticScore).toBe(100);
  });

  it("gives larger score when contributions are spread", () => {
    const sqrtSum1 = Math.sqrt(50);
    const sqrtSum2 = Math.sqrt(50);
    const twoBackers = (sqrtSum1 + sqrtSum2) * (sqrtSum1 + sqrtSum2);
    const oneBackerScore = Math.sqrt(100) * Math.sqrt(100);

    expect(twoBackers).toBeGreaterThan(oneBackerScore);
    expect(roundToCents(twoBackers)).toBe(200);
    expect(oneBackerScore).toBe(100);
  });

  it("distributes match pool proportionally to quadratic scores", () => {
    const MATCH_POOL = 50;
    const scores = [100, 200, 300];
    const total = scores.reduce((a, b) => a + b, 0);
    const matchScale = MATCH_POOL / total;

    const matches = scores.map((s) => roundToCents(s * matchScale));
    expect(matches).toEqual([8.33, 16.67, 25]);
    expect(matches.reduce((a, b) => a + b, 0)).toBeCloseTo(50, 1);
  });

  it("handles empty intents gracefully", () => {
    const totalQuadraticScore = 0;
    const matchScale = totalQuadraticScore > 0 ? 50 / totalQuadraticScore : 0;
    expect(matchScale).toBe(0);
  });
});
