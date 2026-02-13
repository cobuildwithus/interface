import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRawMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  $replica: () => ({ $queryRaw: queryRawMock }),
}));

vi.mock("server-only", () => ({}));
type UnstableCache = typeof import("next/cache").unstable_cache;
vi.mock("next/cache", () => ({
  unstable_cache: ((fn) => fn) as UnstableCache,
}));
vi.mock("@/lib/server/db/cobuild-db-client", () => ({ default: prismaMock }));

import {
  getProfileStatsByFid,
  getProfileActivityByFid,
  getTopTopicsByFid,
  getRecentRepliesByFid,
  getRecentRepliesGroupedByFid,
} from "@/lib/integrations/farcaster/casts/profile-topics";

describe("profile topics", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  it("returns zeros for invalid fid", async () => {
    await expect(getProfileStatsByFid(0)).resolves.toEqual({
      topicsCreated: 0,
      postsCreated: 0,
      totalViews: 0,
    });
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("maps profile stats rows", async () => {
    queryRawMock.mockResolvedValueOnce([{ topicsCreated: 2n, postsCreated: 3n, totalViews: 10n }]);

    const stats = await getProfileStatsByFid(123);
    expect(stats).toEqual({ topicsCreated: 2, postsCreated: 3, totalViews: 10 });
  });

  it("returns zeros when no stats rows found", async () => {
    queryRawMock.mockResolvedValueOnce([]);

    const stats = await getProfileStatsByFid(123);
    expect(stats).toEqual({ topicsCreated: 0, postsCreated: 0, totalViews: 0 });
  });

  it("returns empty topics when fid is invalid", async () => {
    const topics = await getTopTopicsByFid(0, 5);

    expect(topics).toEqual([]);
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("maps top topics and keeps first line intact", async () => {
    const longText = "a".repeat(90);
    queryRawMock.mockResolvedValueOnce([
      {
        hash: Buffer.from("topic"),
        text: longText,
        castTimestamp: new Date("2024-01-01T00:00:00Z"),
        viewCount: 12n,
      },
      {
        hash: Buffer.from("skip"),
        text: " ",
        castTimestamp: new Date("2024-01-01T00:00:00Z"),
        viewCount: 5n,
      },
    ]);

    const topics = await getTopTopicsByFid(123, 5);
    expect(topics).toHaveLength(1);
    expect(topics[0]?.title).toBe(longText);
    expect(topics[0]?.viewCount).toBe(12);
  });

  it("inserts mentions into topic titles", async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        hash: Buffer.from("topic"),
        text: "hello  world",
        castTimestamp: new Date("2024-01-01T00:00:00Z"),
        viewCount: 1n,
        mentionsPositions: [6],
        mentionProfiles: [{ fid: 1, fname: "cobuild" }],
      },
    ]);

    const topics = await getTopTopicsByFid(123, 5);
    expect(topics[0]?.title).toContain("@cobuild");
  });

  it("maps short titles and filters missing hashes", async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        hash: Buffer.from("topic"),
        text: "Hello world",
        castTimestamp: null,
        viewCount: null,
      },
      {
        hash: Buffer.from("topic2"),
        text: "Hello there",
        castTimestamp: new Date("2024-01-01T00:00:00Z"),
        viewCount: 1n,
      },
      {
        hash: null,
        text: "Should skip",
        castTimestamp: new Date("2024-01-01T00:00:00Z"),
        viewCount: 3n,
      },
    ]);

    const topics = await getTopTopicsByFid(123, 5);
    expect(topics).toHaveLength(2);
    expect(topics[0]?.title).toBe("Hello world");
    expect(topics[0]?.viewCount).toBe(0);
    expect(topics[1]?.title).toBe("Hello there");
  });

  it("returns empty replies when fid is invalid", async () => {
    const replies = await getRecentRepliesByFid(-1, 2);

    expect(replies).toEqual([]);
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("returns empty activity when fid is invalid", async () => {
    const activity = await getProfileActivityByFid(0, { topicsLimit: 1, repliesLimit: 1 });

    expect(activity).toEqual({ topics: [], replies: [] });
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("returns activity lists for valid fid", async () => {
    queryRawMock
      .mockResolvedValueOnce([
        {
          hash: Buffer.from("topic"),
          text: "Top topic text",
          castTimestamp: new Date("2024-01-01T00:00:00Z"),
          viewCount: 3n,
        },
      ])
      .mockResolvedValueOnce([
        {
          hash: Buffer.from("reply"),
          text: "Great point!",
          castTimestamp: new Date("2024-01-02T00:00:00Z"),
          rootParentHash: Buffer.from("root"),
          rootText: "Root topic",
          parentHash: null,
          parentText: null,
          parentTimestamp: null,
          parentUsername: null,
        },
      ]);

    const activity = await getProfileActivityByFid(123, { topicsLimit: 1, repliesLimit: 1 });

    expect(activity.topics).toHaveLength(1);
    expect(activity.replies).toHaveLength(1);
    expect(queryRawMock).toHaveBeenCalledTimes(2);
  });

  it("filters recent replies for substantial text", async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        hash: Buffer.from("reply"),
        text: "Nice work on this update",
        castTimestamp: new Date("2024-01-02T00:00:00Z"),
        rootParentHash: Buffer.from("root"),
      },
      {
        hash: null,
        text: "Missing hash should be filtered",
        castTimestamp: new Date("2024-01-02T00:00:00Z"),
        rootParentHash: Buffer.from("root"),
      },
      {
        hash: Buffer.from("emoji"),
        text: "😀😀😀",
        castTimestamp: new Date("2024-01-02T00:00:00Z"),
        rootParentHash: null,
      },
      {
        hash: Buffer.from("short"),
        text: "hi",
        castTimestamp: new Date("2024-01-02T00:00:00Z"),
        rootParentHash: null,
      },
    ]);

    const replies = await getRecentRepliesByFid(123, 2);
    expect(replies).toHaveLength(1);
    expect(replies[0]?.rootHash).toBe("0x726f6f74");
  });

  it("keeps replies with null root hash and filters empty text", async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        hash: Buffer.from("reply1"),
        text: "Solid update",
        castTimestamp: null,
        rootParentHash: null,
      },
      {
        hash: Buffer.from("reply2"),
        text: null,
        castTimestamp: new Date("2024-01-02T00:00:00Z"),
        rootParentHash: Buffer.from("root"),
      },
    ]);

    const replies = await getRecentRepliesByFid(123, 1);
    expect(replies).toHaveLength(1);
    expect(replies[0]?.rootHash).toBeNull();
  });

  it("builds parent quote and truncates long reply metadata", async () => {
    const longParentText = "p".repeat(310);
    const longReplyText = "r".repeat(220);
    const longRootText = "Root ".repeat(20);

    queryRawMock.mockResolvedValueOnce([
      {
        hash: Buffer.from("reply"),
        text: longReplyText,
        castTimestamp: new Date("2024-01-02T00:00:00Z"),
        rootParentHash: Buffer.from("root"),
        rootText: longRootText,
        parentText: longParentText,
        parentTimestamp: new Date("2024-01-01T00:00:00Z"),
        parentUsername: "alice",
      },
    ]);

    const replies = await getRecentRepliesByFid(123, 1);
    expect(replies).toHaveLength(1);
    expect(replies[0]?.title.endsWith("...")).toBe(true);
    expect(replies[0]?.topicTitle?.endsWith("...")).toBe(true);
    expect(replies[0]?.parentQuote?.text.endsWith("...")).toBe(true);
    expect(replies[0]?.parentQuote?.username).toBe("alice");
  });

  it("groups replies by root hash and skips invalid rows", async () => {
    const rootHash = Buffer.from("root");
    const longParentText = "Parent " + "p".repeat(200);
    queryRawMock.mockResolvedValueOnce([
      {
        hash: Buffer.from("reply1"),
        text: "Helpful response",
        castTimestamp: new Date("2024-01-02T00:00:00Z"),
        rootParentHash: rootHash,
        rootText: "",
        parentFid: 2n,
        parentText: longParentText,
        parentUsername: "bob",
      },
      {
        hash: Buffer.from("reply2"),
        text: "Another response",
        castTimestamp: new Date("2024-01-03T00:00:00Z"),
        rootParentHash: rootHash,
        rootText: "A root topic",
        parentFid: 2n,
        parentText: null,
        parentUsername: null,
      },
      {
        hash: Buffer.from("skip-emoji"),
        text: "😀😀😀",
        castTimestamp: new Date("2024-01-03T00:00:00Z"),
        rootParentHash: rootHash,
        rootText: "A root topic",
        parentFid: null,
        parentText: null,
        parentUsername: null,
      },
      {
        hash: Buffer.from("skip-root"),
        text: "Missing root hash",
        castTimestamp: new Date("2024-01-03T00:00:00Z"),
        rootParentHash: null,
        rootText: "Root text",
        parentFid: null,
        parentText: null,
        parentUsername: null,
      },
    ]);

    const groups = await getRecentRepliesGroupedByFid(123, 5);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.topicTitle).toBe("Untitled thread");
    expect(groups[0]?.replies).toHaveLength(2);
    expect(groups[0]?.replies[0]?.parentQuote?.username).toBe("bob");
    expect(groups[0]?.replies[0]?.parentQuote?.text).toBe(longParentText.trim());
  });
});
