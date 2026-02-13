import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";

import {
  NEYNAR_ELIGIBILITY_MIN_SCORE,
  getOrFetchNeynarScore,
  computeNeynarEligibilityForFid,
} from "./neynar-score";

vi.mock("server-only", () => ({}));

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    farcasterProfile: {
      findUnique: (...args: Parameters<typeof mockFindUnique>) => mockFindUnique(...args),
      update: (...args: Parameters<typeof mockUpdate>) => mockUpdate(...args),
    },
  },
}));

const mockNeynarFetchUsersByFids = vi.fn();
const mockExtractScoreFromNeynarUser = vi.fn();

vi.mock("@/lib/integrations/farcaster/neynar-client", () => ({
  neynarFetchUsersByFids: (...args: Parameters<typeof mockNeynarFetchUsersByFids>) =>
    mockNeynarFetchUsersByFids(...args),
  extractScoreFromNeynarUser: (...args: Parameters<typeof mockExtractScoreFromNeynarUser>) =>
    mockExtractScoreFromNeynarUser(...args),
}));

const passthroughCache = vi.hoisted(
  () =>
    ((
      fn: Parameters<typeof unstableCache>[0],
      _keyParts?: Parameters<typeof unstableCache>[1],
      _options?: Parameters<typeof unstableCache>[2]
    ) => fn) as typeof unstableCache
);
vi.mock("next/cache", () => ({
  unstable_cache: passthroughCache,
}));

describe("NEYNAR_ELIGIBILITY_MIN_SCORE", () => {
  it("is set to 0.55", () => {
    expect(NEYNAR_ELIGIBILITY_MIN_SCORE).toBe(0.55);
  });
});

describe("getOrFetchNeynarScore", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for invalid fid values", async () => {
    expect(await getOrFetchNeynarScore(NaN)).toBeNull();
    expect(await getOrFetchNeynarScore(0)).toBeNull();
    expect(await getOrFetchNeynarScore(-1)).toBeNull();
    expect(await getOrFetchNeynarScore(Infinity)).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockNeynarFetchUsersByFids).not.toHaveBeenCalled();
  });

  it("returns score from database when available", async () => {
    mockFindUnique.mockResolvedValueOnce({ neynarUserScore: 0.85 });

    const result = await getOrFetchNeynarScore(123);

    expect(result).toBe(0.85);
    expect(mockNeynarFetchUsersByFids).not.toHaveBeenCalled();
  });

  it("fetches from API when database score is invalid", async () => {
    mockFindUnique.mockResolvedValueOnce({ neynarUserScore: "invalid" });
    mockNeynarFetchUsersByFids.mockResolvedValueOnce([{ fid: 123 }]);
    mockExtractScoreFromNeynarUser.mockReturnValueOnce(0.6);

    const result = await getOrFetchNeynarScore(123);

    expect(result).toBe(0.6);
    expect(mockNeynarFetchUsersByFids).toHaveBeenCalledWith([123]);
  });

  it("fetches from API when database read fails", async () => {
    mockFindUnique.mockRejectedValueOnce(new Error("DB connection failed"));
    mockNeynarFetchUsersByFids.mockResolvedValueOnce([{ fid: 123 }]);
    mockExtractScoreFromNeynarUser.mockReturnValueOnce(0.7);

    const result = await getOrFetchNeynarScore(123);

    expect(result).toBe(0.7);
    expect(mockNeynarFetchUsersByFids).toHaveBeenCalledWith([123]);
  });

  it("fetches from Neynar API when not in database", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const mockUser = { fid: 123, experimental: { neynar_user_score: 0.65 } };
    mockNeynarFetchUsersByFids.mockResolvedValueOnce([mockUser]);
    mockExtractScoreFromNeynarUser.mockReturnValueOnce(0.65);

    const result = await getOrFetchNeynarScore(123);

    expect(result).toBe(0.65);
    expect(mockNeynarFetchUsersByFids).toHaveBeenCalledWith([123]);
  });

  it("persists fetched score to database", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const mockUser = { fid: 123, experimental: { neynar_user_score: 0.75 } };
    mockNeynarFetchUsersByFids.mockResolvedValueOnce([mockUser]);
    mockExtractScoreFromNeynarUser.mockReturnValueOnce(0.75);

    await getOrFetchNeynarScore(123);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { fid: BigInt(123) },
      data: expect.objectContaining({
        neynarUserScore: 0.75,
      }),
    });
  });

  it("returns null when Neynar API returns no users", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockNeynarFetchUsersByFids.mockResolvedValueOnce([]);
    mockExtractScoreFromNeynarUser.mockReturnValueOnce(null);

    const result = await getOrFetchNeynarScore(123);

    expect(result).toBeNull();
  });

  it("returns null when extractScoreFromNeynarUser returns null", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockNeynarFetchUsersByFids.mockResolvedValueOnce([{ fid: 123 }]);
    mockExtractScoreFromNeynarUser.mockReturnValueOnce(null);

    const result = await getOrFetchNeynarScore(123);

    expect(result).toBeNull();
  });

  it("returns null when score is NaN from API", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockNeynarFetchUsersByFids.mockResolvedValueOnce([{ fid: 123 }]);
    mockExtractScoreFromNeynarUser.mockReturnValueOnce(NaN);

    const result = await getOrFetchNeynarScore(123);

    expect(result).toBeNull();
  });

  it("returns fetched score even when database write fails", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockNeynarFetchUsersByFids.mockResolvedValueOnce([{ fid: 123 }]);
    mockExtractScoreFromNeynarUser.mockReturnValueOnce(0.8);
    mockUpdate.mockRejectedValueOnce(new Error("DB write failed"));

    const result = await getOrFetchNeynarScore(123);

    expect(result).toBe(0.8);
  });
});

describe("computeNeynarEligibilityForFid", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns eligible when fid is null", async () => {
    const result = await computeNeynarEligibilityForFid(null);

    expect(result).toEqual({ ineligible: false, reason: null, score: null });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns eligible when fid is undefined", async () => {
    const result = await computeNeynarEligibilityForFid(undefined);

    expect(result).toEqual({ ineligible: false, reason: null, score: null });
  });

  it("returns eligible when fid is zero", async () => {
    const result = await computeNeynarEligibilityForFid(0);

    expect(result).toEqual({ ineligible: false, reason: null, score: null });
  });

  it("returns eligible when fid is negative", async () => {
    const result = await computeNeynarEligibilityForFid(-1);

    expect(result).toEqual({ ineligible: false, reason: null, score: null });
  });

  it("returns ineligible with reason 'missing' when score cannot be found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockNeynarFetchUsersByFids.mockResolvedValueOnce([]);
    mockExtractScoreFromNeynarUser.mockReturnValueOnce(null);

    const result = await computeNeynarEligibilityForFid(123);

    expect(result).toEqual({
      ineligible: true,
      reason: "missing",
      score: null,
    });
  });

  it("returns ineligible with reason 'low' when score is below threshold", async () => {
    const lowScore = NEYNAR_ELIGIBILITY_MIN_SCORE - 0.01;
    mockFindUnique.mockResolvedValueOnce({ neynarUserScore: lowScore });

    const result = await computeNeynarEligibilityForFid(123);

    expect(result).toEqual({ ineligible: true, reason: "low", score: lowScore });
  });

  it("returns eligible when score equals threshold", async () => {
    mockFindUnique.mockResolvedValueOnce({
      neynarUserScore: NEYNAR_ELIGIBILITY_MIN_SCORE,
    });

    const result = await computeNeynarEligibilityForFid(123);

    expect(result).toEqual({
      ineligible: false,
      reason: null,
      score: NEYNAR_ELIGIBILITY_MIN_SCORE,
    });
  });

  it("returns eligible when score exceeds threshold", async () => {
    const highScore = NEYNAR_ELIGIBILITY_MIN_SCORE + 0.1;
    mockFindUnique.mockResolvedValueOnce({ neynarUserScore: highScore });

    const result = await computeNeynarEligibilityForFid(123);

    expect(result).toEqual({
      ineligible: false,
      reason: null,
      score: highScore,
    });
  });

  it("returns eligible with high score (0.9+)", async () => {
    mockFindUnique.mockResolvedValueOnce({ neynarUserScore: 0.95 });

    const result = await computeNeynarEligibilityForFid(123);

    expect(result).toEqual({ ineligible: false, reason: null, score: 0.95 });
  });

  it("returns ineligible for very low score (0.1)", async () => {
    mockFindUnique.mockResolvedValueOnce({ neynarUserScore: 0.1 });

    const result = await computeNeynarEligibilityForFid(123);

    expect(result).toEqual({ ineligible: true, reason: "low", score: 0.1 });
  });

  it("returns ineligible for score of exactly 0", async () => {
    mockFindUnique.mockResolvedValueOnce({ neynarUserScore: 0 });

    const result = await computeNeynarEligibilityForFid(123);

    expect(result).toEqual({ ineligible: true, reason: "low", score: 0 });
  });

  it("fetches from API when not in database and returns correct eligibility", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockNeynarFetchUsersByFids.mockResolvedValueOnce([{ fid: 456 }]);
    mockExtractScoreFromNeynarUser.mockReturnValueOnce(0.7);

    const result = await computeNeynarEligibilityForFid(456);

    expect(result).toEqual({ ineligible: false, reason: null, score: 0.7 });
  });

  it("returns ineligible when API fetch returns low score", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockNeynarFetchUsersByFids.mockResolvedValueOnce([{ fid: 456 }]);
    mockExtractScoreFromNeynarUser.mockReturnValueOnce(0.3);

    const result = await computeNeynarEligibilityForFid(456);

    expect(result).toEqual({ ineligible: true, reason: "low", score: 0.3 });
  });
});

describe("edge cases", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("handles score at exact boundary (0.55)", async () => {
    mockFindUnique.mockResolvedValueOnce({ neynarUserScore: 0.55 });

    const result = await computeNeynarEligibilityForFid(123);

    expect(result.ineligible).toBe(false);
    expect(result.score).toBe(0.55);
  });

  it("handles score just below boundary (0.549999)", async () => {
    mockFindUnique.mockResolvedValueOnce({ neynarUserScore: 0.549999 });

    const result = await computeNeynarEligibilityForFid(123);

    expect(result.ineligible).toBe(true);
    expect(result.reason).toBe("low");
  });

  it("handles very large fid", async () => {
    mockFindUnique.mockResolvedValueOnce({ neynarUserScore: 0.8 });

    const result = await computeNeynarEligibilityForFid(999999999);

    expect(result.ineligible).toBe(false);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { fid: BigInt(999999999) },
      select: { neynarUserScore: true },
    });
  });

  it("handles floating point precision correctly", async () => {
    mockFindUnique.mockResolvedValueOnce({
      neynarUserScore: 0.5500000000000001,
    });

    const result = await computeNeynarEligibilityForFid(123);

    expect(result.ineligible).toBe(false);
  });
});
