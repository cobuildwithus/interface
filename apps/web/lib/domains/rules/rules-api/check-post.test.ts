import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the downstream handlers to isolate username validation testing
const mockCheckCastAgainstRule = vi.fn();
const mockCheckTweetAgainstRule = vi.fn();
const mockRoundFindUnique = vi.fn();
vi.mock("@/lib/domains/rules/cast-rules/actions", () => ({
  checkCastAgainstRule: (input: Parameters<typeof mockCheckCastAgainstRule>[0]) =>
    mockCheckCastAgainstRule(input),
}));
vi.mock("@/lib/domains/rules/tweet-rules/actions", () => ({
  checkTweetAgainstRule: (input: Parameters<typeof mockCheckTweetAgainstRule>[0]) =>
    mockCheckTweetAgainstRule(input),
}));
vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    round: {
      findUnique: (input: Parameters<typeof mockRoundFindUnique>[0]) => mockRoundFindUnique(input),
    },
  },
}));

// Mock cast resolution
vi.mock("@/lib/integrations/farcaster/resolve-cast", () => ({
  resolveCastHashFromUrl: vi.fn().mockResolvedValue({ ok: true, hash: "0x" + "a".repeat(40) }),
}));

// Import after mocks are set up
import { checkPostAgainstRule } from "./check-post";

describe("checkPostAgainstRule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoundFindUnique.mockResolvedValue({ startAt: null, endAt: null, primaryRuleId: 1 });
    // Default successful responses for downstream handlers
    mockCheckCastAgainstRule.mockResolvedValue({
      ok: true,
      data: {
        castHash: "0x" + "a".repeat(40),
        ruleId: 1,
        rulePassed: true,
        outcomeCode: "passed",
        outcomeReason: "Test",
        tags: [],
      },
    });
    mockCheckTweetAgainstRule.mockResolvedValue({
      ok: true,
      data: {
        tweetId: "1996708979628491080",
        ruleId: 1,
        rulePassed: true,
        outcomeCode: "passed",
        outcomeReason: "Test",
      },
    });
  });

  describe("X platform", () => {
    it("accepts raw tweet IDs", async () => {
      const result = await checkPostAgainstRule({
        roundId: "1",
        platform: "x",
        ruleId: 1,
        postInput: "1996708979628491080",
      });
      expect(result.ok).toBe(true);
      expect(mockCheckTweetAgainstRule).toHaveBeenCalledWith({
        ruleId: 1,
        tweetUrlOrId: "1996708979628491080",
      });
    });

    it("accepts X URLs regardless of path username (ownership checked upstream)", async () => {
      const result = await checkPostAgainstRule({
        roundId: "1",
        platform: "x",
        ruleId: 1,
        postInput: "https://x.com/correctusername/status/1996708979628491080",
      });

      expect(result.ok).toBe(true);
      expect(mockCheckTweetAgainstRule).toHaveBeenCalledWith({
        ruleId: 1,
        tweetUrlOrId: "1996708979628491080",
      });
    });

    it("passes through valid X URLs", async () => {
      const result = await checkPostAgainstRule({
        roundId: "1",
        platform: "x",
        ruleId: 1,
        postInput: "https://x.com/faircaster/status/1996708979628491080",
      });

      expect(result.ok).toBe(true);
      expect(mockCheckTweetAgainstRule).toHaveBeenCalledWith({
        ruleId: 1,
        tweetUrlOrId: "1996708979628491080",
      });
    });
  });

  describe("Farcaster platform", () => {
    const fullHash = "0x" + "a".repeat(40);

    it("accepts raw full hashes", async () => {
      const result = await checkPostAgainstRule({
        roundId: "1",
        platform: "farcaster",
        ruleId: 1,
        postInput: fullHash,
      });
      expect(result.ok).toBe(true);
      expect(mockCheckCastAgainstRule).toHaveBeenCalledWith({
        ruleId: 1,
        castHash: fullHash,
      });
    });

    it("accepts conversation URLs", async () => {
      const result = await checkPostAgainstRule({
        roundId: "1",
        platform: "farcaster",
        ruleId: 1,
        postInput: `https://farcaster.xyz/~/conversations/${fullHash}`,
      });
      expect(result.ok).toBe(true);
    });

    it("accepts supercast URLs", async () => {
      const result = await checkPostAgainstRule({
        roundId: "1",
        platform: "farcaster",
        ruleId: 1,
        postInput: `https://supercast.xyz/c/${fullHash}`,
      });
      expect(result.ok).toBe(true);
    });

    it("resolves short Farcaster hashes via URL", async () => {
      const result = await checkPostAgainstRule({
        roundId: "1",
        platform: "farcaster",
        ruleId: 1,
        postInput: "https://farcaster.xyz/rocketman/0x62ed03c3",
      });
      expect(result.ok).toBe(true);
    });
  });

  describe("empty input handling", () => {
    it("rejects empty input", async () => {
      const result = await checkPostAgainstRule({
        roundId: "1",
        platform: "x",
        ruleId: 1,
        postInput: "",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Missing post reference");
      }
    });

    it("rejects whitespace-only input", async () => {
      const result = await checkPostAgainstRule({
        roundId: "1",
        platform: "farcaster",
        ruleId: 1,
        postInput: "   ",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Missing post reference");
      }
    });
  });

  it("rejects invalid rule/round ids", async () => {
    const badRule = await checkPostAgainstRule({
      roundId: "1",
      platform: "x",
      ruleId: 0,
      postInput: "1996708979628491080",
    });
    expect(badRule.ok).toBe(false);

    const badRound = await checkPostAgainstRule({
      roundId: "abc",
      platform: "x",
      ruleId: 1,
      postInput: "1996708979628491080",
    });
    expect(badRound.ok).toBe(false);
  });

  it("returns error when post ref cannot be resolved", async () => {
    const result = await checkPostAgainstRule({
      roundId: "1",
      platform: "farcaster",
      ruleId: 1,
      postInput: "0xabc",
    });

    expect(result.ok).toBe(false);
  });

  it("returns error for invalid X input format", async () => {
    const result = await checkPostAgainstRule({
      roundId: "1",
      platform: "x",
      ruleId: 1,
      postInput: "not-a-tweet",
    });

    expect(result.ok).toBe(false);
  });

  it("returns error when cast resolution fails", async () => {
    const { resolveCastHashFromUrl } = await import("@/lib/integrations/farcaster/resolve-cast");
    vi.mocked(resolveCastHashFromUrl).mockResolvedValueOnce({
      ok: false,
      error: "boom",
    });

    const result = await checkPostAgainstRule({
      roundId: "1",
      platform: "farcaster",
      ruleId: 1,
      postInput: "https://farcaster.xyz/rocketman/0x62ed03c3",
    });

    expect(result.ok).toBe(false);
  });

  it("returns unsupported post reference for non-farcaster needs_resolution", async () => {
    vi.resetModules();

    const mockCheckCastAgainstRule = vi.fn();
    const mockCheckTweetAgainstRule = vi.fn();
    const mockRoundFindUnique = vi.fn().mockResolvedValue({
      startAt: null,
      endAt: null,
      primaryRuleId: 1,
    });

    vi.doMock("@/lib/domains/rules/cast-rules/actions", () => ({
      checkCastAgainstRule: (input: Parameters<typeof mockCheckCastAgainstRule>[0]) =>
        mockCheckCastAgainstRule(input),
    }));
    vi.doMock("@/lib/domains/rules/tweet-rules/actions", () => ({
      checkTweetAgainstRule: (input: Parameters<typeof mockCheckTweetAgainstRule>[0]) =>
        mockCheckTweetAgainstRule(input),
    }));
    vi.doMock("@/lib/server/db/cobuild-db-client", () => ({
      default: {
        round: {
          findUnique: (input: Parameters<typeof mockRoundFindUnique>[0]) =>
            mockRoundFindUnique(input),
        },
      },
    }));
    vi.doMock("@/lib/domains/social/platforms", () => ({
      PLATFORMS: {
        farcaster: {
          input: { toPostRefCandidate: () => ({ kind: "ready", postRef: "0x" + "a".repeat(40) }) },
        },
        x: {
          input: {
            toPostRefCandidate: () => ({ kind: "needs_resolution", url: "https://x.com/1" }),
          },
        },
      },
    }));

    const { checkPostAgainstRule: checkPostAgainstRuleReimport } = await import("./check-post");

    const result = await checkPostAgainstRuleReimport({
      roundId: "1",
      platform: "x",
      ruleId: 1,
      postInput: "https://x.com/1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Unsupported post reference");
    }
  });

  it("normalizes llm payloads", async () => {
    mockCheckCastAgainstRule.mockResolvedValueOnce({
      ok: true,
      data: {
        castHash: "0x" + "a".repeat(40),
        ruleId: 1,
        rulePassed: true,
        outcomeCode: "passed",
        outcomeReason: "Test",
        tags: [],
        llm: { gradeEvaluated: 0, pass: null, reason: "why" },
      },
    });

    const result = await checkPostAgainstRule({
      roundId: "1",
      platform: "farcaster",
      ruleId: 1,
      postInput: "0x" + "a".repeat(40),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.llm?.gradeEvaluated).toBe(false);
    }
  });

  it("surfaces downstream errors", async () => {
    mockCheckCastAgainstRule.mockResolvedValueOnce({ ok: false, error: "bad" });
    const result = await checkPostAgainstRule({
      roundId: "1",
      platform: "farcaster",
      ruleId: 1,
      postInput: "0x" + "a".repeat(40),
    });
    expect(result.ok).toBe(false);
  });

  describe("round timing gating", () => {
    it("rejects submissions before startAt", async () => {
      mockRoundFindUnique.mockResolvedValue({
        startAt: new Date(Date.now() + 60_000),
        endAt: null,
        primaryRuleId: 1,
      });

      const result = await checkPostAgainstRule({
        roundId: "1",
        platform: "x",
        ruleId: 1,
        postInput: "1996708979628491080",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("hasn't started");
      }
      expect(mockCheckTweetAgainstRule).not.toHaveBeenCalled();
    });

    it("rejects submissions after endAt", async () => {
      mockRoundFindUnique.mockResolvedValue({
        startAt: null,
        endAt: new Date(Date.now() - 60_000),
        primaryRuleId: 1,
      });

      const result = await checkPostAgainstRule({
        roundId: "1",
        platform: "farcaster",
        ruleId: 1,
        postInput: "0x" + "a".repeat(40),
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("over");
      }
      expect(mockCheckCastAgainstRule).not.toHaveBeenCalled();
    });

    it("rejects when the round cannot be found", async () => {
      mockRoundFindUnique.mockResolvedValue(null);

      const result = await checkPostAgainstRule({
        roundId: "1",
        platform: "x",
        ruleId: 1,
        postInput: "1996708979628491080",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Round not found");
      }
      expect(mockCheckTweetAgainstRule).not.toHaveBeenCalled();
    });

    it("rejects when round primaryRuleId mismatches ruleId", async () => {
      mockRoundFindUnique.mockResolvedValue({ startAt: null, endAt: null, primaryRuleId: 999 });

      const result = await checkPostAgainstRule({
        roundId: "1",
        platform: "x",
        ruleId: 1,
        postInput: "1996708979628491080",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("mismatch");
      }
      expect(mockCheckTweetAgainstRule).not.toHaveBeenCalled();
    });
  });
});
