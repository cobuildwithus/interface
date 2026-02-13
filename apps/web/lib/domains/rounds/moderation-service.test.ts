import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPostFilterRuleFindUnique = vi.fn();
const mockRoundSubmissionDeleteMany = vi.fn();
const mockPostFilterRuleUpdate = vi.fn();
const mockIsAdminFor = vi.fn();

const mockRewriteRequirementsText = vi.fn();
const mockRescoreOpenRoundsForRule = vi.fn();

vi.mock("@/lib/config/admins", () => ({
  isAdminFor: (...args: Parameters<typeof mockIsAdminFor>) => mockIsAdminFor(...args),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    postFilterRule: {
      findUnique: (...args: Parameters<typeof mockPostFilterRuleFindUnique>) =>
        mockPostFilterRuleFindUnique(...args),
      update: (...args: Parameters<typeof mockPostFilterRuleUpdate>) =>
        mockPostFilterRuleUpdate(...args),
    },
    roundSubmission: {
      deleteMany: (...args: Parameters<typeof mockRoundSubmissionDeleteMany>) =>
        mockRoundSubmissionDeleteMany(...args),
    },
  },
}));

vi.mock("./cast-rules-ai", () => ({
  rewriteRequirementsText: (...args: Parameters<typeof mockRewriteRequirementsText>) =>
    mockRewriteRequirementsText(...args),
}));

vi.mock("./rescore-api", () => ({
  rescoreOpenRoundsForRule: (...args: Parameters<typeof mockRescoreOpenRoundsForRule>) =>
    mockRescoreOpenRoundsForRule(...args),
}));

describe("markIneligible", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockIsAdminFor.mockReturnValue(true);
    mockPostFilterRuleFindUnique.mockResolvedValue({
      outputTag: "demo-tag",
      admins: [],
      requirementsText: "old requirements",
      primaryEvalRounds: [{ id: BigInt(1), title: "Round 1" }],
    });
    mockRoundSubmissionDeleteMany.mockResolvedValue({ count: 1 });
    mockRewriteRequirementsText.mockResolvedValue(null);
    mockRescoreOpenRoundsForRule.mockResolvedValue(undefined);
  });

  it("removes x submissions without cast-hash validation", async () => {
    const { markIneligible } = await import("./moderation-service");

    const res = await markIneligible({
      userAddress: `0x${"1".repeat(40)}` as const,
      ruleId: 7,
      source: "x",
      castHash: "1234567890",
      moderatorNote: "spam",
      castText: "x post",
      alsoUpdateRequirements: false,
    });

    expect(res).toEqual(
      expect.objectContaining({
        ok: true,
        removedSubmission: true,
        removedTag: false,
        requirementsUpdated: false,
        affectedRoundIds: ["1"],
      })
    );

    expect(mockRoundSubmissionDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          source: "x",
          postId: { in: expect.arrayContaining(["1234567890"]) },
        }),
      })
    );
    expect(mockRewriteRequirementsText).not.toHaveBeenCalled();
  });

  it("requires a moderator note", async () => {
    const { markIneligible } = await import("./moderation-service");

    const res = await markIneligible({
      userAddress: `0x${"4".repeat(40)}` as const,
      ruleId: 7,
      source: "x",
      castHash: "1234567890",
      moderatorNote: "   ",
      castText: "x post",
    });

    expect(res).toEqual({ ok: false, error: "Add a reason before marking ineligible." });
    expect(mockPostFilterRuleFindUnique).not.toHaveBeenCalled();
  });

  it("rejects invalid farcaster hash", async () => {
    const { markIneligible } = await import("./moderation-service");

    const res = await markIneligible({
      userAddress: `0x${"5".repeat(40)}` as const,
      ruleId: 7,
      source: "farcaster",
      castHash: "not-a-hash",
      moderatorNote: "spam",
      castText: "cast",
    });

    expect(res).toEqual({ ok: false, error: "Invalid cast hash." });
  });

  it("rejects when round not found", async () => {
    mockPostFilterRuleFindUnique.mockResolvedValueOnce({ outputTag: null });
    const { markIneligible } = await import("./moderation-service");

    const res = await markIneligible({
      userAddress: `0x${"6".repeat(40)}` as const,
      ruleId: 7,
      source: "x",
      castHash: "123",
      moderatorNote: "spam",
      castText: "cast",
    });

    expect(res).toEqual({ ok: false, error: "Round not found." });
  });

  it("rejects non-admin moderators", async () => {
    mockIsAdminFor.mockReturnValue(false);
    const { markIneligible } = await import("./moderation-service");

    const res = await markIneligible({
      userAddress: `0x${"7".repeat(40)}` as const,
      ruleId: 7,
      source: "x",
      castHash: "123",
      moderatorNote: "spam",
      castText: "cast",
    });

    expect(res).toEqual({ ok: false, error: "You are not allowed to moderate this round." });
  });

  it("rewrites requirements only when alsoUpdateRequirements is true", async () => {
    mockRewriteRequirementsText.mockResolvedValue("new requirements");

    const { markIneligible } = await import("./moderation-service");

    const res = await markIneligible({
      userAddress: `0x${"2".repeat(40)}` as const,
      ruleId: 7,
      source: "x",
      castHash: "1234567890",
      moderatorNote: "spam",
      castText: "x post",
      alsoUpdateRequirements: true,
    });

    expect(res).toEqual(expect.objectContaining({ ok: true, requirementsUpdated: true }));
    expect(mockRewriteRequirementsText).toHaveBeenCalledTimes(1);
    expect(mockPostFilterRuleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: { requirementsText: "new requirements" },
      })
    );
  });

  it("skips rewrite when requirements do not change", async () => {
    mockRewriteRequirementsText.mockResolvedValue("old requirements");

    const { markIneligible } = await import("./moderation-service");

    const res = await markIneligible({
      userAddress: `0x${"3".repeat(40)}` as const,
      ruleId: 7,
      source: "x",
      castHash: "1234567890",
      moderatorNote: "spam",
      castText: "x post",
      alsoUpdateRequirements: true,
    });

    expect(res).toEqual(expect.objectContaining({ ok: true, requirementsUpdated: false }));
    expect(mockPostFilterRuleUpdate).not.toHaveBeenCalled();
  });

  it("skips deletion when no rounds are attached", async () => {
    mockPostFilterRuleFindUnique.mockResolvedValueOnce({
      outputTag: "demo-tag",
      admins: [],
      requirementsText: "old requirements",
      primaryEvalRounds: [],
    });

    const { markIneligible } = await import("./moderation-service");

    const res = await markIneligible({
      userAddress: `0x${"a".repeat(40)}` as const,
      ruleId: 7,
      source: "x",
      castHash: "1234567890",
      moderatorNote: "spam",
      castText: "x post",
      alsoUpdateRequirements: false,
    });

    expect(res).toEqual(
      expect.objectContaining({ ok: true, removedSubmission: false, affectedRoundIds: [] })
    );
    expect(mockRoundSubmissionDeleteMany).not.toHaveBeenCalled();
  });

  it("skips rescore when nothing removed", async () => {
    mockRoundSubmissionDeleteMany.mockResolvedValue({ count: 0 });

    const { markIneligible } = await import("./moderation-service");

    const res = await markIneligible({
      userAddress: `0x${"8".repeat(40)}` as const,
      ruleId: 7,
      source: "farcaster",
      castHash: "a".repeat(40),
      moderatorNote: "off-topic",
      castText: "hello",
      alsoUpdateRequirements: false,
    });

    expect(res).toEqual(
      expect.objectContaining({ ok: true, removedTag: false, removedSubmission: false })
    );
    expect(mockRescoreOpenRoundsForRule).not.toHaveBeenCalled();
  });

  it("handles rewrite failures gracefully", async () => {
    mockRewriteRequirementsText.mockRejectedValueOnce(new Error("boom"));

    const { markIneligible } = await import("./moderation-service");

    const res = await markIneligible({
      userAddress: `0x${"9".repeat(40)}` as const,
      ruleId: 7,
      source: "x",
      castHash: "1234567890",
      moderatorNote: "spam",
      castText: "x post",
      alsoUpdateRequirements: true,
    });

    expect(res).toEqual(expect.objectContaining({ ok: true, requirementsUpdated: false }));
  });

  it("stops after max rewrite attempts", async () => {
    mockRewriteRequirementsText.mockRejectedValue(new Error("boom"));

    const { markIneligible } = await import("./moderation-service");

    const res = await markIneligible({
      userAddress: `0x${"b".repeat(40)}` as const,
      ruleId: 7,
      source: "x",
      castHash: "1234567890",
      moderatorNote: "spam",
      castText: "x post",
      alsoUpdateRequirements: true,
    });

    expect(res).toEqual(expect.objectContaining({ ok: true, requirementsUpdated: false }));
    expect(mockPostFilterRuleUpdate).not.toHaveBeenCalled();
  });
});
