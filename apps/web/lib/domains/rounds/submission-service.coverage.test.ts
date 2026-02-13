import { describe, expect, it, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => {
  const queryRaw = vi.fn();
  return {
    $queryRaw: queryRaw,
    $replica: () => ({ $queryRaw: queryRaw }),
    roundSubmission: { findFirst: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    aiModelOutput: { findFirst: vi.fn() },
  };
});

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({ default: prismaMock }));
vi.mock("@/lib/domains/rounds/submission-metadata", () => ({
  getBeneficiaryAddressFromMetadata: () => "0x" + "b".repeat(40),
}));

type CastRow = Record<string, string | number | boolean | null | object>;
vi.mock("@/lib/domains/rounds/cast-mappers", () => ({
  mapCastRowToFarcasterCast: (row: CastRow) => ({ hash: "0x" + "a".repeat(40), row }),
}));

import {
  getSubmissionsByRoundWithAiOutputs,
  getRoundSubmissionByPostId,
  getCastByHash,
  getRoundEntityIds,
} from "@/lib/domains/rounds/submission-service";

describe("submission service", () => {
  beforeEach(() => {
    prismaMock.$queryRaw.mockReset();
    prismaMock.roundSubmission.findFirst.mockReset();
    prismaMock.roundSubmission.findMany.mockReset();
    prismaMock.aiModelOutput.findFirst.mockReset();
  });

  it("returns empty for invalid round", async () => {
    const result = await getSubmissionsByRoundWithAiOutputs("bad", 1);
    expect(result).toEqual({ submissions: [], roundEntityIds: [] });
  });

  it("maps submissions and entity ids", async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      {
        source: "farcaster",
        postId: "0x" + "a".repeat(40),
        url: null,
        createdAt: null,
        insertedAt: new Date("2024-01-01T00:00:00Z"),
        aiTitle: null,
        aiCategory: null,
        authorHandle: "",
        authorDisplayName: null,
        authorAvatarUrl: null,
        rawText: "hello",
        displayText: null,
        metadata: {},
        mediaUrls: null,
        evalShare: 0.5,
        evalRank: 1n,
        evalWinRate: 0.9,
      },
      {
        source: "x",
        postId: "1234567890",
        url: "https://x.com/test/status/1234567890",
        createdAt: new Date("2024-01-02T00:00:00Z"),
        insertedAt: new Date("2024-01-02T00:00:00Z"),
        aiTitle: "AI title",
        aiCategory: null,
        authorHandle: null,
        authorDisplayName: null,
        authorAvatarUrl: null,
        rawText: null,
        displayText: "display",
        metadata: {},
        mediaUrls: [],
        evalShare: null,
        evalRank: null,
        evalWinRate: null,
      },
    ]);

    const result = await getSubmissionsByRoundWithAiOutputs("1", 1);
    expect(result.submissions).toHaveLength(2);
    expect(result.roundEntityIds).toHaveLength(2);
  });

  it("fetches submission by post id", async () => {
    prismaMock.roundSubmission.findFirst.mockResolvedValue({
      source: "farcaster",
      postId: "0x" + "a".repeat(40),
      url: null,
      authorHandle: "alice",
      authorDisplayName: null,
      authorAvatarUrl: null,
      rawText: "hello",
      displayText: null,
      createdAt: null,
      insertedAt: new Date("2024-01-01T00:00:00Z"),
      aiTitle: null,
      aiCategory: null,
      metadata: {},
      mediaUrls: null,
    });
    prismaMock.aiModelOutput.findFirst.mockResolvedValueOnce({
      id: 1n,
      model: "model",
      output: { pass: true },
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });

    const result = await getRoundSubmissionByPostId({
      roundId: "1",
      postId: "0x" + "a".repeat(40),
      ruleId: 1,
    });
    expect(result?.aiOutput?.model).toBe("model");

    prismaMock.aiModelOutput.findFirst.mockResolvedValueOnce({
      id: 2n,
      model: "model",
      output: { pass: true },
      createdAt: null,
    });
    const noAi = await getRoundSubmissionByPostId({
      roundId: "1",
      postId: "0x" + "a".repeat(40),
      ruleId: 1,
    });
    expect(noAi?.aiOutput).toBeNull();
  });

  it("returns null when submission missing or invalid", async () => {
    prismaMock.roundSubmission.findFirst.mockResolvedValue(null);
    await expect(
      getRoundSubmissionByPostId({ roundId: "1", postId: "0x" + "a".repeat(40), ruleId: 1 })
    ).resolves.toBeNull();

    await expect(
      getRoundSubmissionByPostId({ roundId: "1", postId: "", ruleId: 1 })
    ).resolves.toBeNull();

    await expect(
      getRoundSubmissionByPostId({ roundId: "bad", postId: "0x" + "a".repeat(40), ruleId: 1 })
    ).resolves.toBeNull();
  });

  it("returns cast by hash", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ hash: Buffer.from("a".repeat(40), "hex") }]);
    const cast = await getCastByHash("0x" + "a".repeat(40), 1, "1");
    expect(cast?.hash).toBe("0x" + "a".repeat(40));

    prismaMock.$queryRaw.mockResolvedValue([]);
    const none = await getCastByHash("0x" + "a".repeat(40), 1, "1");
    expect(none).toBeNull();

    const invalid = await getCastByHash("bad", 1, "1");
    expect(invalid).toBeNull();
  });

  it("returns entity ids", async () => {
    prismaMock.roundSubmission.findMany.mockResolvedValue([
      { postId: "0x" + "a".repeat(40) },
      { postId: "bad" },
    ]);

    const ids = await getRoundEntityIds("1");
    expect(ids).toContain("0x" + "a".repeat(40));
  });
});
