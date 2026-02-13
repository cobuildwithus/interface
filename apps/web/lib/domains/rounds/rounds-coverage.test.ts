import { describe, expect, it, vi, beforeEach } from "vitest";
import { getRoundTimingError } from "@/lib/domains/rounds/timing";
import { mapCastRowToFarcasterCast } from "@/lib/domains/rounds/cast-mappers";

vi.mock("server-only", () => ({}));

const prismaMock = vi.hoisted(() => ({
  round: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({ default: prismaMock }));

import { getRoundById, getAllRounds, getRoundsList } from "@/lib/domains/rounds/rounds";

const mockRound = {
  id: 1n,
  title: "Round",
  description: "desc",
  prompt: "prompt",
  status: "open",
  variant: "default",
  startAt: new Date("2024-01-01T00:00:00Z"),
  endAt: new Date("2024-01-02T00:00:00Z"),
  primaryRule: {
    id: 9,
    title: "Rule",
    outputTag: "tag",
    requirementsText: "req",
    ctaText: "cta",
    castTemplate: "tmpl",
    perUserLimit: 1,
    admins: [],
  },
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

describe("rounds", () => {
  beforeEach(() => {
    prismaMock.round.findUnique.mockReset();
    prismaMock.round.findMany.mockReset();
  });

  it("returns null for invalid id", async () => {
    await expect(getRoundById("bad")).resolves.toBeNull();
  });

  it("returns null for undefined id", async () => {
    // @ts-expect-error exercising runtime guard for undefined input
    await expect(getRoundById(undefined)).resolves.toBeNull();
  });

  it("maps round data", async () => {
    prismaMock.round.findUnique.mockResolvedValue(mockRound);
    const round = await getRoundById("1");
    expect(round?.id).toBe("1");
    expect(round?.primaryRule.title).toBe("Rule");
  });

  it("returns null when round not found", async () => {
    prismaMock.round.findUnique.mockResolvedValue(null);
    const round = await getRoundById("1");
    expect(round).toBeNull();
  });

  it("maps all rounds", async () => {
    prismaMock.round.findMany.mockResolvedValue([
      mockRound,
      {
        ...mockRound,
        id: 2n,
        startAt: null,
        endAt: null,
      },
    ]);
    const rounds = await getAllRounds();
    expect(rounds).toHaveLength(2);
    expect(rounds[0]?.id).toBe("1");
  });

  it("maps rounds list items", async () => {
    prismaMock.round.findMany.mockResolvedValue([
      mockRound,
      {
        ...mockRound,
        id: 2n,
        description: null,
      },
    ]);
    const rounds = await getRoundsList();
    expect(rounds).toHaveLength(2);
    expect(rounds[0]).toEqual({
      id: "1",
      title: "Round",
      description: "desc",
      status: "open",
    });
  });
});

describe("round timing", () => {
  it("returns timing errors", () => {
    const notStarted = getRoundTimingError({
      startAt: "2025-01-01T00:00:00Z",
      endAt: null,
      nowMs: Date.parse("2024-01-01T00:00:00Z"),
    });
    expect(notStarted?.code).toBe("not_started");

    const ended = getRoundTimingError({
      startAt: null,
      endAt: "2024-01-02T00:00:00Z",
      nowMs: Date.parse("2024-01-03T00:00:00Z"),
    });
    expect(ended?.code).toBe("ended");
  });
});

describe("cast mappers", () => {
  it("maps cast row to farcaster cast", () => {
    const row: Parameters<typeof mapCastRowToFarcasterCast>[0] = {
      hash: Buffer.from("a".repeat(40), "hex"),
      text: "hello @alice",
      castTimestamp: new Date("2024-01-01T00:00:00Z"),
      embedsArray: [{ url: "https://example.com" }],
      mentionsPositions: [6],
      mentionProfiles: [{ fid: 1, fname: "alice" }],
      fid: 1n,
      authorFname: "alice",
      authorDisplayName: "Alice",
      authorAvatarUrl: "avatar",
      authorNeynarScore: 0.95,
      aiOutputId: 1n,
      aiOutputModel: "model",
      aiOutputOutput: { pass: true },
      aiOutputCreatedAt: new Date("2024-01-01T00:00:00Z"),
      evalShare: 0.5,
      evalRank: 1n,
      evalWinRate: 0.9,
    };

    const cast = mapCastRowToFarcasterCast(row);
    expect(cast.hash.startsWith("0x")).toBe(true);
    expect(cast.author.power_badge).toBe(true);
    expect(cast.aiOutput?.model).toBe("model");
    expect(cast.evalScore?.rank).toBe(1);
  });

  it("handles missing optional fields", () => {
    const row: Parameters<typeof mapCastRowToFarcasterCast>[0] = {
      hash: Buffer.from("b".repeat(40), "hex"),
      text: null,
      castTimestamp: null,
      embedsArray: null,
      mentionsPositions: null,
      mentionProfiles: null,
      fid: 2n,
      authorFname: null,
      authorDisplayName: null,
      authorAvatarUrl: null,
      authorNeynarScore: 0.1,
      aiOutputId: null,
      aiOutputModel: null,
      aiOutputOutput: null,
      aiOutputCreatedAt: null,
      evalShare: null,
      evalRank: null,
      evalWinRate: null,
    };

    const cast = mapCastRowToFarcasterCast(row);
    expect(cast.aiOutput).toBeNull();
    expect(cast.evalScore).toBeNull();
    expect(cast.embeds).toEqual([]);
  });

  it("parses mixed mention profiles and embeds", () => {
    const row: Parameters<typeof mapCastRowToFarcasterCast>[0] = {
      hash: Buffer.from("c".repeat(40), "hex"),
      text: "hello @bob",
      castTimestamp: new Date("2024-01-01T00:00:00Z"),
      embedsArray: [{ url: "https://example.com" }, { notUrl: true }],
      mentionsPositions: [6],
      mentionProfiles: [
        { fid: " 3 ", fname: "bob" },
        { fid: 4n, fname: null },
        { fid: null, fname: "skip" },
        null,
      ],
      fid: 3n,
      authorFname: "bob",
      authorDisplayName: null,
      authorAvatarUrl: null,
      authorNeynarScore: 0.5,
      aiOutputId: null,
      aiOutputModel: null,
      aiOutputOutput: null,
      aiOutputCreatedAt: null,
      evalShare: "0.2",
      evalRank: null,
      evalWinRate: null,
    };

    const cast = mapCastRowToFarcasterCast(row);
    expect(cast.mentioned_profiles ?? []).toHaveLength(2);
    expect(cast.embeds).toEqual([{ url: "https://example.com" }, {}]);
  });
});
