import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { mapCastRowToFarcasterCast } from "@/lib/domains/rounds/cast-mappers";

const baseRow = {
  hash: Buffer.from("deadbeef", "hex"),
  text: "hello  world",
  castTimestamp: new Date("2024-01-01T00:00:00Z"),
  embedsArray: [{ url: "https://example.com" }, { foo: "bar" }],
  mentionsPositions: [6],
  mentionProfiles: [{ fid: 1, fname: "alice" }],
  fid: BigInt(42),
  authorFname: "alice",
  authorDisplayName: "Alice",
  authorAvatarUrl: "https://avatar",
  authorNeynarScore: 0.95,
  aiOutputId: BigInt(7),
  aiOutputModel: "gpt",
  aiOutputOutput: { verdict: "pass" },
  aiOutputCreatedAt: new Date("2024-01-02T00:00:00Z"),
  evalShare: "0.25",
  evalRank: BigInt(3),
  evalWinRate: 0.6,
};

afterEach(() => {
  vi.useRealTimers();
});

describe("mapCastRowToFarcasterCast", () => {
  it("maps a full row into a Farcaster cast", () => {
    const cast = mapCastRowToFarcasterCast(baseRow);

    expect(cast.hash).toBe("0xdeadbeef");
    expect(cast.text).toBe("hello @alice world");
    expect(cast.timestamp).toBe("2024-01-01T00:00:00.000Z");
    expect(cast.embeds).toEqual([{ url: "https://example.com" }, {}]);
    expect(cast.mentioned_profiles).toEqual([{ fid: 1 }]);
    expect(cast.mentions_positions).toEqual([6]);

    expect(cast.author).toEqual({
      fid: 42,
      username: "alice",
      display_name: "Alice",
      pfp_url: "https://avatar",
      power_badge: true,
      neynar_score: 0.95,
    });

    expect(cast.aiOutput).toEqual({
      id: "7",
      model: "gpt",
      output: { verdict: "pass" },
      createdAt: "2024-01-02T00:00:00.000Z",
    });

    expect(cast.evalScore).toEqual({ share: 0.25, rank: 3, winRate: 0.6 });
  });

  it("handles missing optional data and defaults", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-01T00:00:00Z"));

    const cast = mapCastRowToFarcasterCast({
      ...baseRow,
      text: null,
      castTimestamp: null,
      embedsArray: "invalid",
      mentionsPositions: null,
      mentionProfiles: [{ fid: "oops" }, null],
      authorNeynarScore: 0.1,
      aiOutputId: null,
      aiOutputModel: null,
      aiOutputOutput: null,
      aiOutputCreatedAt: null,
      evalShare: "not-a-number",
      evalRank: null,
      evalWinRate: null,
    });

    expect(cast.text).toBe("");
    expect(cast.timestamp).toBe("2024-03-01T00:00:00.000Z");
    expect(cast.embeds).toEqual([]);
    expect(cast.mentioned_profiles).toEqual([]);
    expect(cast.mentions_positions).toEqual([]);
    expect(cast.aiOutput).toBeNull();
    expect(cast.evalScore).toBeNull();
    expect(cast.author.power_badge).toBe(false);
  });
});
