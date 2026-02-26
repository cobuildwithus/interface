import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRoundSubmissionFindFirst = vi.fn();
const mockAiModelOutputFindFirst = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    roundSubmission: {
      findFirst: (...args: Parameters<typeof mockRoundSubmissionFindFirst>) =>
        mockRoundSubmissionFindFirst(...args),
    },
    aiModelOutput: {
      findFirst: (...args: Parameters<typeof mockAiModelOutputFindFirst>) =>
        mockAiModelOutputFindFirst(...args),
    },
  },
}));

describe("getRoundSubmissionByPostId", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns aiOutput for farcaster submissions with valid cast hash", async () => {
    mockRoundSubmissionFindFirst.mockResolvedValue({
      source: "farcaster",
      postId: `0x${"a".repeat(40)}`,
      url: null,
      authorHandle: null,
      authorDisplayName: null,
      authorAvatarUrl: null,
      rawText: null,
      displayText: "hello",
      createdAt: null,
      insertedAt: new Date("2025-01-01T00:00:00.000Z"),
      aiTitle: null,
      aiCategory: null,
      metadata: null,
      mediaUrls: [],
    });

    mockAiModelOutputFindFirst.mockResolvedValue({
      id: BigInt(9),
      model: "gpt-5-mini",
      output: { pass: true, reason: "ok" },
      createdAt: new Date("2025-01-02T00:00:00.000Z"),
    });

    const { getRoundSubmissionByPostId } = await import("./submission-service");
    const res = await getRoundSubmissionByPostId({
      roundId: "123",
      postId: "0x" + "A".repeat(40),
      ruleId: 7,
    });

    expect(res?.source).toBe("farcaster");
    expect(res?.postId).toBe(`0x${"a".repeat(40)}`);
    expect(res?.entityId).toBe(`0x${"a".repeat(40)}`);
    expect(res?.handle).toBe("fc");
    expect(res?.displayName).toBe("Farcaster");
    expect(res?.summaryText).toBe("hello");
    expect(res?.createdAt).toBe("2025-01-01T00:00:00.000Z");
    expect(res?.aiOutput?.id).toBe("9");
    expect(res?.aiOutput?.model).toBe("gpt-5-mini");
    expect(res?.aiOutput?.output).toEqual({ pass: true, reason: "ok" });
    expect(res?.aiOutput?.createdAt).toBe("2025-01-02T00:00:00.000Z");

    expect(mockAiModelOutputFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ruleId: 7,
          postId: `0x${"a".repeat(40)}`,
        }),
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("queries ai outputs for x submissions via postId", async () => {
    mockRoundSubmissionFindFirst.mockResolvedValue({
      source: "x",
      postId: "1234567890",
      url: "https://x.com/any/status/123",
      authorHandle: "user",
      authorDisplayName: "User",
      authorAvatarUrl: null,
      rawText: "x post",
      displayText: "x post",
      createdAt: null,
      insertedAt: new Date("2025-01-01T00:00:00.000Z"),
      aiTitle: null,
      aiCategory: null,
      metadata: { beneficiaryAddress: "0xabc" },
      mediaUrls: ["https://example.com/x.png"],
    });
    mockAiModelOutputFindFirst.mockResolvedValue(null);

    const { getRoundSubmissionByPostId } = await import("./submission-service");
    const res = await getRoundSubmissionByPostId({
      roundId: "123",
      postId: "https://x.com/any/status/1234567890",
      ruleId: 7,
    });

    expect(res?.source).toBe("x");
    expect(res?.postId).toBe("1234567890");
    expect(res?.entityId).toBe("1234567890");
    expect(res?.handle).toBe("user");
    expect(res?.displayName).toBe("User");
    expect(res?.summaryText).toBe("x post");
    expect(res?.beneficiaryAddress).toBe("0xabc");
    expect(res?.mediaUrls).toEqual(["https://example.com/x.png"]);
    expect(res?.aiOutput).toBeNull();
    expect(mockRoundSubmissionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          roundId: BigInt(123),
          postId: "1234567890",
        }),
      })
    );
    expect(mockAiModelOutputFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ruleId: 7,
          postId: "1234567890",
        }),
        orderBy: { createdAt: "desc" },
      })
    );
  });
});
