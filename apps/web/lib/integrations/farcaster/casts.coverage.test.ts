import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { queryRawMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    $replica: () => ({
      $queryRaw: (...args: Parameters<typeof queryRawMock>) => queryRawMock(...args),
    }),
  },
}));

type CastRow = {
  hash?: Buffer | null;
  fid?: bigint | number | null;
  authorFname?: string | null;
  authorDisplayName?: string | null;
  authorAvatarUrl?: string | null;
  authorNeynarScore?: number | null;
  text?: string | null;
  castTimestamp?: { toISOString?: () => string } | null;
  embedsArray?: Array<Record<string, string>> | null;
  mentionProfiles?: Array<Record<string, string>> | null;
  mentionsPositions?: number[] | null;
};

vi.mock("@/lib/domains/rounds/cast-mappers", () => ({
  mapCastRowToFarcasterCast: (row: CastRow) => ({
    hash: row.hash ? `0x${Buffer.from(row.hash as Buffer).toString("hex")}` : "0x0",
    author: {
      fid: Number((row.fid as bigint | number | null | undefined) ?? 0),
      username: (row.authorFname as string | null | undefined) ?? null,
      display_name: (row.authorDisplayName as string | null | undefined) ?? null,
      pfp_url: (row.authorAvatarUrl as string | null | undefined) ?? null,
      neynar_score: (row.authorNeynarScore as number | null | undefined) ?? null,
    },
    text: (row.text as string | null | undefined) ?? "",
    timestamp:
      (row.castTimestamp as { toISOString?: () => string } | null | undefined)?.toISOString?.() ??
      new Date(0).toISOString(),
    embeds: row.embedsArray ?? [],
    mentioned_profiles: row.mentionProfiles ?? null,
    mentions_positions: (row.mentionsPositions as number[] | null | undefined) ?? null,
  }),
}));

vi.mock("@/lib/integrations/farcaster/urls", () => ({
  getFarcasterChannelUrl: () => "https://farcaster.xyz/channel/cobuild",
}));

vi.mock("@/lib/integrations/farcaster/activity", () => ({
  getCobuildActivityByFids: () => new Map(),
}));

vi.mock("@/lib/shared/entity-id", () => ({
  normalizeEntityId: (id: string) => id.toLowerCase(),
}));

import {
  getCobuildDiscussionCastsPage,
  getCobuildFlatCastThread,
} from "@/lib/integrations/farcaster/casts";
import { getCobuildThreadMergeGroup } from "@/lib/integrations/farcaster/casts/thread";
import type { ThreadCast } from "@/lib/integrations/farcaster/casts/types";
import * as threadHelpers from "@/lib/integrations/farcaster/casts/thread/helpers";

type ThreadRow = Awaited<ReturnType<typeof threadHelpers.loadCobuildThreadRows>>[number];

const baseThreadRow = {
  aiOutputId: null,
  aiOutputModel: null,
  aiOutputOutput: null,
  aiOutputCreatedAt: null,
  evalShare: null,
  evalRank: null,
  evalWinRate: null,
};

describe("farcaster casts", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  it("builds discussion casts page with attachments", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 2n }]).mockResolvedValueOnce([
      {
        hash: Buffer.from("a".repeat(40), "hex"),
        text: "Title line\nExcerpt text",
        castTimestamp: new Date("2024-01-01T00:00:00Z"),
        embedsArray: [{ url: "https://example.com/link" }],
        embedSummaries: [JSON.stringify({ ogImage: { url: "https://img.neynar.com/image.png" } })],
        mentionsPositions: [],
        mentionProfiles: [],
        fid: 1n,
        authorFname: "alice",
        authorDisplayName: "Alice",
        authorAvatarUrl: "avatar",
        authorNeynarScore: 1,
        replyCount: "5",
      },
      {
        hash: Buffer.from("b".repeat(40), "hex"),
        text: "Second post",
        castTimestamp: new Date("2024-01-02T00:00:00Z"),
        embedsArray: [{ url: "https://example.com/other" }],
        embedSummaries: ["https://example.com/other"],
        mentionsPositions: null,
        mentionProfiles: null,
        fid: 2n,
        authorFname: "bob",
        authorDisplayName: "Bob",
        authorAvatarUrl: "avatar-2",
        authorNeynarScore: 1,
        replyCount: 0,
      },
    ]);

    const page = await getCobuildDiscussionCastsPage(1, 0);

    expect(page.hasMore).toBe(true);
    expect(page.items[0]?.title).toBe("Title line");
    expect(page.items[0]?.excerpt).toBe("Excerpt text");
    expect(page.items[0]?.replyCount).toBe(5);
    expect(page.items[0]?.attachment?.kind).toBe("image");
  });

  it("returns null attachment when no embeds", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 1n }]).mockResolvedValueOnce([
      {
        hash: Buffer.from("c".repeat(40), "hex"),
        text: "Solo",
        castTimestamp: new Date("2024-01-03T00:00:00Z"),
        embedsArray: [],
        embedSummaries: null,
        mentionsPositions: null,
        mentionProfiles: null,
        fid: 3n,
        authorFname: null,
        authorDisplayName: null,
        authorAvatarUrl: null,
        authorNeynarScore: 1,
        replyCount: null,
      },
    ]);

    const page = await getCobuildDiscussionCastsPage(1, 0);
    expect(page.items[0]?.attachment).toBeNull();
  });

  it("filters discussion casts with empty text", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 2n }]).mockResolvedValueOnce([
      {
        hash: Buffer.from("1".repeat(40), "hex"),
        text: "   ",
        castTimestamp: new Date("2024-01-04T00:00:00Z"),
        embedsArray: [],
        embedSummaries: null,
        mentionsPositions: null,
        mentionProfiles: null,
        fid: 5n,
        authorFname: "empty",
        authorDisplayName: "Empty",
        authorAvatarUrl: null,
        authorNeynarScore: 1,
        replyCount: 0,
      },
      {
        hash: Buffer.from("2".repeat(40), "hex"),
        text: "Has text",
        castTimestamp: new Date("2024-01-05T00:00:00Z"),
        embedsArray: [],
        embedSummaries: null,
        mentionsPositions: null,
        mentionProfiles: null,
        fid: 6n,
        authorFname: "writer",
        authorDisplayName: "Writer",
        authorAvatarUrl: null,
        authorNeynarScore: 1,
        replyCount: 0,
      },
    ]);

    const page = await getCobuildDiscussionCastsPage(10, 0);

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.title).toBe("Has text");
  });

  it("handles empty counts and last reply metadata", async () => {
    const lastReplyTimestamp = new Date("2024-01-08T00:00:00Z");
    queryRawMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        hash: Buffer.from("f".repeat(40), "hex"),
        text: "With reply",
        castTimestamp: new Date("2024-01-08T00:00:00Z"),
        embedsArray: [],
        embedSummaries: null,
        mentionsPositions: null,
        mentionProfiles: null,
        fid: 9n,
        authorFname: "frank",
        authorDisplayName: "Frank",
        authorAvatarUrl: null,
        authorNeynarScore: 1,
        replyCount: 2,
        viewCount: 7,
        lastReplyTimestamp,
        lastReplyAuthorFname: null,
      },
    ]);

    const page = await getCobuildDiscussionCastsPage(5, 0);

    expect(page.totalCount).toBe(0);
    expect(page.totalPages).toBe(0);
    expect(page.hasMore).toBe(false);
    expect(page.items[0]?.lastReply).toEqual({
      createdAt: lastReplyTimestamp.toISOString(),
      authorUsername: "unknown",
    });
  });

  it("extracts urls from summary arrays", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 1n }]).mockResolvedValueOnce([
      {
        hash: Buffer.from("e".repeat(40), "hex"),
        text: "Array summary",
        castTimestamp: new Date("2024-01-04T00:00:00Z"),
        embedsArray: [],
        embedSummaries: [
          JSON.stringify([
            { images: [{ url: "https://img.neynar.com/array.png" }] },
            { metadata: { url: "https://example.com/fallback" } },
          ]),
        ],
        mentionsPositions: null,
        mentionProfiles: null,
        fid: 6n,
        authorFname: "eve",
        authorDisplayName: "Eve",
        authorAvatarUrl: null,
        authorNeynarScore: 1,
        replyCount: 0,
      },
    ]);

    const page = await getCobuildDiscussionCastsPage(1, 0);
    expect(page.items[0]?.attachment?.kind).toBe("image");
  });

  it("returns null for invalid thread hash", async () => {
    const result = await getCobuildFlatCastThread("not-a-hash");
    expect(result).toBeNull();
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("returns null when thread query returns no rows", async () => {
    const rootHash = "0x" + "a".repeat(40);
    const rootSpy = vi.spyOn(threadHelpers, "loadCobuildRootCastRow").mockResolvedValue(null);

    const thread = await getCobuildFlatCastThread(rootHash);
    expect(thread).toBeNull();

    rootSpy.mockRestore();
  });

  it("builds flat thread with attachments", async () => {
    const rootHash = "0x" + "a".repeat(40);
    const replyHash = "0x" + "b".repeat(40);
    const rootRow = {
      ...baseThreadRow,
      hash: Buffer.from("a".repeat(40), "hex"),
      text: "Root",
      castTimestamp: new Date("2024-01-01T00:00:00Z"),
      embedsArray: [],
      embedSummaries: [JSON.stringify({ url: "https://example.com/page" })],
      mentionsPositions: [],
      mentionProfiles: [],
      fid: 1n,
      authorFname: "alice",
      authorDisplayName: "Alice",
      authorAvatarUrl: "avatar",
      authorNeynarScore: 1,
      parentHash: null,
      viewCount: 9n,
      hiddenAt: null,
      hiddenReason: null,
    };
    const replyRows = [
      {
        ...baseThreadRow,
        hash: Buffer.from("b".repeat(40), "hex"),
        text: "Reply",
        castTimestamp: new Date("2024-01-01T01:00:00Z"),
        embedsArray: [],
        embedSummaries: ["https://images.neynar.com/reply.png"],
        mentionsPositions: [],
        mentionProfiles: [],
        fid: 2n,
        authorFname: "bob",
        authorDisplayName: "Bob",
        authorAvatarUrl: "avatar-2",
        authorNeynarScore: 1,
        parentHash: Buffer.from("a".repeat(40), "hex"),
        viewCount: 2n,
        hiddenAt: null,
        hiddenReason: null,
        mergeTarget: Buffer.from("b".repeat(40), "hex"),
        isMerged: false,
      },
      {
        ...baseThreadRow,
        hash: Buffer.from("c".repeat(40), "hex"),
        text: "Nested",
        castTimestamp: new Date("2024-01-01T02:00:00Z"),
        embedsArray: [],
        embedSummaries: [],
        mentionsPositions: [],
        mentionProfiles: [],
        fid: 3n,
        authorFname: "cory",
        authorDisplayName: "Cory",
        authorAvatarUrl: null,
        authorNeynarScore: 1,
        parentHash: Buffer.from("b".repeat(40), "hex"),
        viewCount: 3n,
        hiddenAt: null,
        hiddenReason: null,
        mergeTarget: Buffer.from("c".repeat(40), "hex"),
        isMerged: false,
      },
    ];

    const rootSpy = vi.spyOn(threadHelpers, "loadCobuildRootCastRow").mockResolvedValue(rootRow);
    const repliesSpy = vi
      .spyOn(threadHelpers, "loadCobuildThreadRepliesPage")
      .mockResolvedValue({ rows: replyRows, replyCount: 2 });
    const parentsSpy = vi.spyOn(threadHelpers, "loadCobuildCastsByHashes").mockResolvedValue([]);

    const thread = await getCobuildFlatCastThread(rootHash);

    expect(thread?.root.hash).toBe(rootHash);
    expect(thread?.replyCount).toBe(2);
    expect(thread?.replies[0]?.hash).toBe(replyHash);
    expect(thread?.root.attachment?.kind).toBe("link");
    expect(thread?.root.attachment?.url).toBe("https://example.com/page");
    expect(thread?.castMap[replyHash]).toBeDefined();

    rootSpy.mockRestore();
    repliesSpy.mockRestore();
    parentsSpy.mockRestore();
  });

  it("merges rapid chained replies from the root author", async () => {
    const rootHash = "0x" + "a".repeat(40);
    const replyHash = "0x" + "b".repeat(40);
    const mergedHash = "0x" + "c".repeat(40);
    const laterHash = "0x" + "d".repeat(40);
    const rootRow = {
      ...baseThreadRow,
      hash: Buffer.from("a".repeat(40), "hex"),
      text: "Root",
      castTimestamp: new Date("2024-01-01T00:00:00Z"),
      embedsArray: [],
      embedSummaries: [],
      mentionsPositions: [],
      mentionProfiles: [],
      fid: 1n,
      authorFname: "alice",
      authorDisplayName: "Alice",
      authorAvatarUrl: "avatar",
      authorNeynarScore: 1,
      parentHash: null,
      viewCount: 0n,
      hiddenAt: null,
      hiddenReason: null,
    };
    const replyRows = [
      {
        ...baseThreadRow,
        hash: Buffer.from("b".repeat(40), "hex"),
        text: "First reply",
        castTimestamp: new Date("2024-01-01T00:00:02Z"),
        embedsArray: [],
        embedSummaries: [],
        mentionsPositions: [],
        mentionProfiles: [],
        fid: 1n,
        authorFname: "alice",
        authorDisplayName: "Alice",
        authorAvatarUrl: "avatar",
        authorNeynarScore: 1,
        parentHash: Buffer.from("a".repeat(40), "hex"),
        viewCount: 1n,
        hiddenAt: null,
        hiddenReason: null,
        mergeTarget: Buffer.from("a".repeat(40), "hex"),
        isMerged: true,
      },
      {
        ...baseThreadRow,
        hash: Buffer.from("c".repeat(40), "hex"),
        text: "Second reply",
        castTimestamp: new Date("2024-01-01T00:00:04Z"),
        embedsArray: [],
        embedSummaries: [],
        mentionsPositions: [],
        mentionProfiles: [],
        fid: 1n,
        authorFname: "alice",
        authorDisplayName: "Alice",
        authorAvatarUrl: "avatar",
        authorNeynarScore: 1,
        parentHash: Buffer.from("b".repeat(40), "hex"),
        viewCount: 1n,
        hiddenAt: null,
        hiddenReason: null,
        mergeTarget: Buffer.from("a".repeat(40), "hex"),
        isMerged: true,
      },
      {
        ...baseThreadRow,
        hash: Buffer.from("d".repeat(40), "hex"),
        text: "Later reply",
        castTimestamp: new Date("2024-01-01T00:00:12Z"),
        embedsArray: [],
        embedSummaries: [],
        mentionsPositions: [],
        mentionProfiles: [],
        fid: 1n,
        authorFname: "alice",
        authorDisplayName: "Alice",
        authorAvatarUrl: "avatar",
        authorNeynarScore: 1,
        parentHash: Buffer.from("a".repeat(40), "hex"),
        viewCount: 1n,
        hiddenAt: null,
        hiddenReason: null,
        mergeTarget: Buffer.from("d".repeat(40), "hex"),
        isMerged: false,
      },
    ];

    const rootSpy = vi.spyOn(threadHelpers, "loadCobuildRootCastRow").mockResolvedValue(rootRow);
    const repliesSpy = vi
      .spyOn(threadHelpers, "loadCobuildThreadRepliesPage")
      .mockResolvedValue({ rows: replyRows, replyCount: 1 });
    const parentsSpy = vi.spyOn(threadHelpers, "loadCobuildCastsByHashes").mockResolvedValue([]);

    const thread = await getCobuildFlatCastThread(rootHash);

    expect(thread?.replyCount).toBe(1);
    expect(thread?.replies.length).toBe(1);
    expect(thread?.replies[0]?.hash).toBe(laterHash);
    expect(thread?.root.text).toBe("Root\n\nFirst reply\n\nSecond reply");
    expect(thread?.castMap[mergedHash]).toBeDefined();
    expect(thread?.castMap[replyHash]).toBeDefined();

    rootSpy.mockRestore();
    repliesSpy.mockRestore();
    parentsSpy.mockRestore();
  });

  it("merges root replies across intervening authors", async () => {
    const rootHash = "0x" + "a".repeat(40);
    const otherHash = "0x" + "b".repeat(40);
    const laterRootHash = "0x" + "c".repeat(40);
    const rootRow = {
      ...baseThreadRow,
      hash: Buffer.from("a".repeat(40), "hex"),
      text: "Root",
      castTimestamp: new Date("2024-01-01T00:00:00Z"),
      embedsArray: [],
      embedSummaries: [],
      mentionsPositions: [],
      mentionProfiles: [],
      fid: 1n,
      authorFname: "alice",
      authorDisplayName: "Alice",
      authorAvatarUrl: "avatar",
      authorNeynarScore: 1,
      parentHash: null,
      viewCount: 0n,
      hiddenAt: null,
      hiddenReason: null,
    };
    const replyRows = [
      {
        ...baseThreadRow,
        hash: Buffer.from("d".repeat(40), "hex"),
        text: "First reply",
        castTimestamp: new Date("2024-01-01T00:00:02Z"),
        embedsArray: [],
        embedSummaries: [],
        mentionsPositions: [],
        mentionProfiles: [],
        fid: 1n,
        authorFname: "alice",
        authorDisplayName: "Alice",
        authorAvatarUrl: "avatar",
        authorNeynarScore: 1,
        parentHash: Buffer.from("a".repeat(40), "hex"),
        viewCount: 1n,
        hiddenAt: null,
        hiddenReason: null,
        mergeTarget: Buffer.from("a".repeat(40), "hex"),
        isMerged: true,
      },
      {
        ...baseThreadRow,
        hash: Buffer.from("b".repeat(40), "hex"),
        text: "Other reply",
        castTimestamp: new Date("2024-01-01T00:00:04Z"),
        embedsArray: [],
        embedSummaries: [],
        mentionsPositions: [],
        mentionProfiles: [],
        fid: 2n,
        authorFname: "bob",
        authorDisplayName: "Bob",
        authorAvatarUrl: "avatar-2",
        authorNeynarScore: 1,
        parentHash: Buffer.from("a".repeat(40), "hex"),
        viewCount: 1n,
        hiddenAt: null,
        hiddenReason: null,
        mergeTarget: Buffer.from("b".repeat(40), "hex"),
        isMerged: false,
      },
      {
        ...baseThreadRow,
        hash: Buffer.from("c".repeat(40), "hex"),
        text: "Second reply",
        castTimestamp: new Date("2024-01-01T00:00:06Z"),
        embedsArray: [],
        embedSummaries: [],
        mentionsPositions: [],
        mentionProfiles: [],
        fid: 1n,
        authorFname: "alice",
        authorDisplayName: "Alice",
        authorAvatarUrl: "avatar",
        authorNeynarScore: 1,
        parentHash: Buffer.from("a".repeat(40), "hex"),
        viewCount: 1n,
        hiddenAt: null,
        hiddenReason: null,
        mergeTarget: Buffer.from("a".repeat(40), "hex"),
        isMerged: true,
      },
    ];

    const rootSpy = vi.spyOn(threadHelpers, "loadCobuildRootCastRow").mockResolvedValue(rootRow);
    const repliesSpy = vi
      .spyOn(threadHelpers, "loadCobuildThreadRepliesPage")
      .mockResolvedValue({ rows: replyRows, replyCount: 1 });
    const parentsSpy = vi.spyOn(threadHelpers, "loadCobuildCastsByHashes").mockResolvedValue([]);

    const thread = await getCobuildFlatCastThread(rootHash);

    expect(thread?.replyCount).toBe(1);
    expect(thread?.replies.map((reply) => reply.hash)).toEqual([otherHash]);
    expect(thread?.root.text).toBe("Root\n\nFirst reply\n\nSecond reply");
    expect(thread?.castMap[laterRootHash]).toBeDefined();

    rootSpy.mockRestore();
    repliesSpy.mockRestore();
    parentsSpy.mockRestore();
  });

  it("keeps low-score parents for quotes while hiding them from replies", async () => {
    const rootHash = "0x" + "a".repeat(40);
    const lowParentHash = "0x" + "b".repeat(40);
    const highReplyHash = "0x" + "c".repeat(40);
    const rootRow = {
      ...baseThreadRow,
      hash: Buffer.from("a".repeat(40), "hex"),
      text: "Root",
      castTimestamp: new Date("2024-01-01T00:00:00Z"),
      embedsArray: [],
      embedSummaries: [],
      mentionsPositions: [],
      mentionProfiles: [],
      fid: 1n,
      authorFname: "alice",
      authorDisplayName: "Alice",
      authorAvatarUrl: "avatar",
      authorNeynarScore: 0.9,
      parentHash: null,
      viewCount: 1n,
      hiddenAt: null,
      hiddenReason: null,
    };
    const replyRows = [
      {
        ...baseThreadRow,
        hash: Buffer.from("c".repeat(40), "hex"),
        text: "High score reply",
        castTimestamp: new Date("2024-01-01T02:00:00Z"),
        embedsArray: [],
        embedSummaries: [],
        mentionsPositions: [],
        mentionProfiles: [],
        fid: 3n,
        authorFname: "cory",
        authorDisplayName: "Cory",
        authorAvatarUrl: null,
        authorNeynarScore: 0.9,
        parentHash: Buffer.from("b".repeat(40), "hex"),
        viewCount: 3n,
        hiddenAt: null,
        hiddenReason: null,
        mergeTarget: Buffer.from("c".repeat(40), "hex"),
        isMerged: false,
      },
    ];
    const parentRows = [
      {
        ...baseThreadRow,
        hash: Buffer.from("b".repeat(40), "hex"),
        text: "Low score parent",
        castTimestamp: new Date("2024-01-01T01:00:00Z"),
        embedsArray: [],
        embedSummaries: [],
        mentionsPositions: [],
        mentionProfiles: [],
        fid: 2n,
        authorFname: "bob",
        authorDisplayName: "Bob",
        authorAvatarUrl: "avatar-2",
        authorNeynarScore: 0.1,
        parentHash: Buffer.from("a".repeat(40), "hex"),
        viewCount: 2n,
        hiddenAt: null,
        hiddenReason: null,
      },
    ];

    const rootSpy = vi.spyOn(threadHelpers, "loadCobuildRootCastRow").mockResolvedValue(rootRow);
    const repliesSpy = vi
      .spyOn(threadHelpers, "loadCobuildThreadRepliesPage")
      .mockResolvedValue({ rows: replyRows, replyCount: 1 });
    const parentsSpy = vi
      .spyOn(threadHelpers, "loadCobuildCastsByHashes")
      .mockResolvedValue(parentRows);

    const thread = await getCobuildFlatCastThread(rootHash);

    expect(thread?.replyCount).toBe(1);
    expect(thread?.replies.map((reply) => reply.hash)).toEqual([highReplyHash]);
    expect(thread?.castMap[lowParentHash]).toBeDefined();

    rootSpy.mockRestore();
    repliesSpy.mockRestore();
    parentsSpy.mockRestore();
  });

  it("filters empty-text replies from threads", async () => {
    const rootHash = "0x" + "a".repeat(40);
    const emptyReplyHash = "0x" + "b".repeat(40);
    const replyHash = "0x" + "c".repeat(40);
    const rootRow = {
      ...baseThreadRow,
      hash: Buffer.from("a".repeat(40), "hex"),
      text: "Root",
      castTimestamp: new Date("2024-01-01T00:00:00Z"),
      embedsArray: [],
      embedSummaries: [],
      mentionsPositions: [],
      mentionProfiles: [],
      fid: 1n,
      authorFname: "alice",
      authorDisplayName: "Alice",
      authorAvatarUrl: "avatar",
      authorNeynarScore: 0.9,
      parentHash: null,
      viewCount: 1n,
      hiddenAt: null,
      hiddenReason: null,
    };
    const replyRows = [
      {
        ...baseThreadRow,
        hash: Buffer.from("c".repeat(40), "hex"),
        text: "Reply",
        castTimestamp: new Date("2024-01-01T02:00:00Z"),
        embedsArray: [],
        embedSummaries: [],
        mentionsPositions: [],
        mentionProfiles: [],
        fid: 3n,
        authorFname: "cory",
        authorDisplayName: "Cory",
        authorAvatarUrl: null,
        authorNeynarScore: 0.9,
        parentHash: Buffer.from("a".repeat(40), "hex"),
        viewCount: 3n,
        hiddenAt: null,
        hiddenReason: null,
        mergeTarget: Buffer.from("c".repeat(40), "hex"),
        isMerged: false,
      },
    ];

    const rootSpy = vi.spyOn(threadHelpers, "loadCobuildRootCastRow").mockResolvedValue(rootRow);
    const repliesSpy = vi
      .spyOn(threadHelpers, "loadCobuildThreadRepliesPage")
      .mockResolvedValue({ rows: replyRows, replyCount: 1 });
    const parentsSpy = vi.spyOn(threadHelpers, "loadCobuildCastsByHashes").mockResolvedValue([]);

    const thread = await getCobuildFlatCastThread(rootHash);

    expect(thread?.replyCount).toBe(1);
    expect(thread?.replies.map((reply) => reply.hash)).toEqual([replyHash]);
    expect(thread?.castMap[emptyReplyHash]).toBeUndefined();

    rootSpy.mockRestore();
    repliesSpy.mockRestore();
    parentsSpy.mockRestore();
  });

  it("respects focusHash when computing thread page", async () => {
    const rootHash = "0x" + "a".repeat(40);
    const replyHash = "0x" + "b".repeat(40);
    const rootRow = {
      ...baseThreadRow,
      hash: Buffer.from("a".repeat(40), "hex"),
      text: "Root",
      castTimestamp: new Date("2024-01-01T00:00:00Z"),
      embedsArray: [],
      embedSummaries: [],
      mentionsPositions: [],
      mentionProfiles: [],
      fid: 1n,
      authorFname: "alice",
      authorDisplayName: "Alice",
      authorAvatarUrl: "avatar",
      authorNeynarScore: 1,
      parentHash: null,
      viewCount: 1n,
      hiddenAt: null,
      hiddenReason: null,
    };
    const replyRows = [
      {
        ...baseThreadRow,
        hash: Buffer.from("b".repeat(40), "hex"),
        text: "Reply",
        castTimestamp: new Date("2024-01-01T01:00:00Z"),
        embedsArray: [],
        embedSummaries: [],
        mentionsPositions: [],
        mentionProfiles: [],
        fid: 0n,
        authorFname: "bob",
        authorDisplayName: "Bob",
        authorAvatarUrl: null,
        authorNeynarScore: 1,
        parentHash: Buffer.from("a".repeat(40), "hex"),
        viewCount: 2n,
        hiddenAt: null,
        hiddenReason: null,
        mergeTarget: Buffer.from("b".repeat(40), "hex"),
        isMerged: false,
      },
    ];

    const rootSpy = vi.spyOn(threadHelpers, "loadCobuildRootCastRow").mockResolvedValue(rootRow);
    const focusSpy = vi
      .spyOn(threadHelpers, "loadCobuildThreadFocusIndex")
      .mockResolvedValue({ mergeTarget: Buffer.from("b".repeat(40), "hex"), index: 0 });
    const repliesSpy = vi
      .spyOn(threadHelpers, "loadCobuildThreadRepliesPage")
      .mockResolvedValue({ rows: replyRows, replyCount: 1 });
    const parentsSpy = vi.spyOn(threadHelpers, "loadCobuildCastsByHashes").mockResolvedValue([]);

    const thread = await getCobuildFlatCastThread(rootHash, { focusHash: replyHash });

    expect(thread?.page).toBe(1);
    expect(thread?.castMap[replyHash]).toBeDefined();

    rootSpy.mockRestore();
    focusSpy.mockRestore();
    repliesSpy.mockRestore();
    parentsSpy.mockRestore();
  });

  it("keeps link attachment as-is", async () => {
    const rootHash = "0x" + "d".repeat(40);
    const rootRow = {
      ...baseThreadRow,
      hash: Buffer.from("d".repeat(40), "hex"),
      text: "Root",
      castTimestamp: new Date("2024-01-01T00:00:00Z"),
      embedsArray: [],
      embedSummaries: [JSON.stringify({ url: "https://example.com/link" })],
      mentionsPositions: [],
      mentionProfiles: [],
      fid: 4n,
      authorFname: "dan",
      authorDisplayName: "Dan",
      authorAvatarUrl: null,
      authorNeynarScore: 1,
      parentHash: null,
      viewCount: 0n,
      hiddenAt: null,
      hiddenReason: null,
    };

    const rootSpy = vi.spyOn(threadHelpers, "loadCobuildRootCastRow").mockResolvedValue(rootRow);
    const repliesSpy = vi
      .spyOn(threadHelpers, "loadCobuildThreadRepliesPage")
      .mockResolvedValue({ rows: [], replyCount: 0 });
    const parentsSpy = vi.spyOn(threadHelpers, "loadCobuildCastsByHashes").mockResolvedValue([]);

    const thread = await getCobuildFlatCastThread(rootHash);
    expect(thread?.root.attachment?.kind).toBe("link");

    rootSpy.mockRestore();
    repliesSpy.mockRestore();
    parentsSpy.mockRestore();
  });

  it("returns null when thread root is missing", async () => {
    const rootHash = "0x" + "e".repeat(40);
    const rootSpy = vi.spyOn(threadHelpers, "loadCobuildRootCastRow").mockResolvedValue(null);

    const thread = await getCobuildFlatCastThread(rootHash);
    expect(thread).toBeNull();

    rootSpy.mockRestore();
  });

  it("handles empty titles and invalid summaries", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 1n }]).mockResolvedValueOnce([
      {
        hash: Buffer.from("1".repeat(40), "hex"),
        text: "\nSecond line",
        castTimestamp: new Date("2024-01-05T00:00:00Z"),
        embedsArray: [{ url: "http://" }],
        embedSummaries: "not-array",
        mentionsPositions: null,
        mentionProfiles: null,
        fid: 7n,
        authorFname: "zoe",
        authorDisplayName: "Zoe",
        authorAvatarUrl: null,
        authorNeynarScore: 1,
        replyCount: "not-a-number",
      },
    ]);

    const page = await getCobuildDiscussionCastsPage(1, 0);

    expect(page.hasMore).toBe(false);
    expect(page.items[0]?.title).toBe("Untitled cast");
    expect(page.items[0]?.excerpt).toBe("Second line");
    expect(page.items[0]?.replyCount).toBe(0);
    expect(page.items[0]?.attachment).toEqual({
      kind: "link",
      url: "http://",
      label: null,
      sourceUrl: "http://",
    });
  });

  it("detects image extensions in summary strings", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 1n }]).mockResolvedValueOnce([
      {
        hash: Buffer.from("2".repeat(40), "hex"),
        text: "Image post",
        castTimestamp: new Date("2024-01-06T00:00:00Z"),
        embedsArray: [],
        embedSummaries: ["  https://example.com/photo.png  ", 123],
        mentionsPositions: null,
        mentionProfiles: null,
        fid: 8n,
        authorFname: "ivy",
        authorDisplayName: "Ivy",
        authorAvatarUrl: null,
        authorNeynarScore: 1,
        replyCount: 0,
      },
    ]);

    const page = await getCobuildDiscussionCastsPage(1, 0);

    expect(page.items[0]?.attachment).toEqual({
      kind: "image",
      url: "https://example.com/photo.png",
      label: null,
      sourceUrl: "https://example.com/photo.png",
    });
  });

  it("supports reply sorting in ascending order", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 1n }]).mockResolvedValueOnce([
      {
        hash: Buffer.from("3".repeat(40), "hex"),
        text: "Sorted by replies",
        castTimestamp: new Date("2024-01-06T00:00:00Z"),
        embedsArray: [],
        embedSummaries: null,
        mentionsPositions: null,
        mentionProfiles: null,
        fid: 12n,
        authorFname: "riley",
        authorDisplayName: "Riley",
        authorAvatarUrl: null,
        authorNeynarScore: 1,
        replyCount: 1,
        viewCount: 10,
        lastReplyTimestamp: null,
        lastReplyAuthorFname: null,
      },
    ]);

    const page = await getCobuildDiscussionCastsPage(1, 0, "replies", "asc");
    expect(page.items[0]?.replyCount).toBe(1);
  });

  it("supports view sorting", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 1n }]).mockResolvedValueOnce([
      {
        hash: Buffer.from("4".repeat(40), "hex"),
        text: "Sorted by views",
        castTimestamp: new Date("2024-01-06T00:00:00Z"),
        embedsArray: [],
        embedSummaries: null,
        mentionsPositions: null,
        mentionProfiles: null,
        fid: 13n,
        authorFname: "vera",
        authorDisplayName: "Vera",
        authorAvatarUrl: null,
        authorNeynarScore: 1,
        replyCount: 0,
        viewCount: 42,
        lastReplyTimestamp: null,
        lastReplyAuthorFname: null,
      },
    ]);

    const page = await getCobuildDiscussionCastsPage(1, 0, "views", "desc");
    expect(page.items[0]?.viewCount).toBe(42);
  });

  it("returns all replies when showing all", async () => {
    const rootHash = "0x" + "c".repeat(40);
    const rootRow = {
      ...baseThreadRow,
      hash: Buffer.from("c".repeat(40), "hex"),
      text: "Root",
      castTimestamp: new Date("2024-01-07T00:00:00Z"),
      embedsArray: [],
      embedSummaries: ["https://images.neynar.com/root.png"],
      mentionsPositions: [],
      mentionProfiles: [],
      fid: 9n,
      authorFname: "root",
      authorDisplayName: "Root",
      authorAvatarUrl: null,
      authorNeynarScore: 1,
      parentHash: null,
      viewCount: 9n,
      hiddenAt: null,
      hiddenReason: null,
    };
    const replyRows = [
      {
        ...baseThreadRow,
        hash: Buffer.from("d".repeat(40), "hex"),
        text: "Reply",
        castTimestamp: new Date("2024-01-07T01:00:00Z"),
        embedsArray: [],
        embedSummaries: [JSON.stringify({ url: "https://example.com/reply.jpg" })],
        mentionsPositions: [],
        mentionProfiles: [],
        fid: 10n,
        authorFname: "reply",
        authorDisplayName: "Reply",
        authorAvatarUrl: null,
        authorNeynarScore: 1,
        parentHash: Buffer.from("c".repeat(40), "hex"),
        viewCount: 1n,
        hiddenAt: null,
        hiddenReason: null,
        mergeTarget: Buffer.from("d".repeat(40), "hex"),
        isMerged: false,
      },
      {
        ...baseThreadRow,
        hash: Buffer.from("e".repeat(40), "hex"),
        text: "Second reply",
        castTimestamp: new Date("2024-01-07T02:00:00Z"),
        embedsArray: [],
        embedSummaries: ["https://example.com/second.gif"],
        mentionsPositions: [],
        mentionProfiles: [],
        fid: 11n,
        authorFname: "second",
        authorDisplayName: "Second",
        authorAvatarUrl: null,
        authorNeynarScore: 1,
        parentHash: Buffer.from("c".repeat(40), "hex"),
        viewCount: 2n,
        hiddenAt: null,
        hiddenReason: null,
        mergeTarget: Buffer.from("e".repeat(40), "hex"),
        isMerged: false,
      },
    ];

    const rootSpy = vi.spyOn(threadHelpers, "loadCobuildRootCastRow").mockResolvedValue(rootRow);
    const repliesSpy = vi
      .spyOn(threadHelpers, "loadCobuildThreadRepliesPage")
      .mockResolvedValue({ rows: replyRows, replyCount: 2 });
    const parentsSpy = vi.spyOn(threadHelpers, "loadCobuildCastsByHashes").mockResolvedValue([]);

    const thread = await getCobuildFlatCastThread(rootHash, { page: 0 });

    expect(thread?.page).toBe(0);
    expect(thread?.pageSize).toBe(2);
    expect(thread?.totalPages).toBe(1);
    expect(thread?.root.viewCount).toBe(9);
    expect(thread?.replies.length).toBe(2);

    rootSpy.mockRestore();
    repliesSpy.mockRestore();
    parentsSpy.mockRestore();
  });

  it("uses root focus hash for pagination", async () => {
    const rootHash = `0x${"a".repeat(40)}`;
    const replyHash = `0x${"b".repeat(40)}`;
    const rootRow = {
      ...baseThreadRow,
      hash: Buffer.from("a".repeat(40), "hex"),
      text: "Root",
      castTimestamp: new Date("2024-01-01T00:00:00Z"),
      embedsArray: [],
      embedSummaries: [],
      mentionsPositions: [],
      mentionProfiles: [],
      fid: 1n,
      authorFname: "alice",
      authorDisplayName: "Alice",
      authorAvatarUrl: null,
      authorNeynarScore: 1,
      parentHash: null,
      viewCount: 0n,
      hiddenAt: null,
      hiddenReason: null,
    };
    const replyRows = [
      {
        ...baseThreadRow,
        hash: Buffer.from("b".repeat(40), "hex"),
        text: "Reply",
        castTimestamp: new Date("2024-01-01T01:00:00Z"),
        embedsArray: [],
        embedSummaries: [],
        mentionsPositions: [],
        mentionProfiles: [],
        fid: 2n,
        authorFname: "bob",
        authorDisplayName: "Bob",
        authorAvatarUrl: null,
        authorNeynarScore: 1,
        parentHash: Buffer.from("a".repeat(40), "hex"),
        viewCount: 0n,
        hiddenAt: null,
        hiddenReason: null,
        mergeTarget: Buffer.from("b".repeat(40), "hex"),
        isMerged: false,
      },
    ];

    const rootSpy = vi.spyOn(threadHelpers, "loadCobuildRootCastRow").mockResolvedValue(rootRow);
    const focusSpy = vi
      .spyOn(threadHelpers, "loadCobuildThreadFocusIndex")
      .mockResolvedValue({ mergeTarget: Buffer.from("a".repeat(40), "hex"), index: null });
    const repliesSpy = vi
      .spyOn(threadHelpers, "loadCobuildThreadRepliesPage")
      .mockResolvedValue({ rows: replyRows, replyCount: 1 });
    const parentsSpy = vi.spyOn(threadHelpers, "loadCobuildCastsByHashes").mockResolvedValue([]);

    const thread = await getCobuildFlatCastThread(rootHash, { focusHash: rootHash });

    expect(thread?.page).toBe(1);
    expect(thread?.hasPrevPage).toBe(false);

    rootSpy.mockRestore();
    focusSpy.mockRestore();
    repliesSpy.mockRestore();
    parentsSpy.mockRestore();
  });

  it("returns merged thread group for a valid root and target", async () => {
    const rootHash = `0x${"a".repeat(40)}`;
    const replyHash = `0x${"b".repeat(40)}`;
    const mergedHash = `0x${"c".repeat(40)}`;

    const loadSpy = vi
      .spyOn(threadHelpers, "loadCobuildThreadRows")
      .mockResolvedValue([{} as ThreadRow]);
    const mapSpy = vi
      .spyOn(threadHelpers, "mapThreadRows")
      .mockReturnValue([{ hash: rootHash } as ThreadCast]);
    const slicesSpy = vi.spyOn(threadHelpers, "getThreadSlices").mockReturnValue({
      root: { hash: rootHash } as ThreadCast,
      visibleReplies: [{ hash: replyHash } as ThreadCast],
      castsWithText: [],
    });
    const mergeSpy = vi
      .spyOn(threadHelpers, "mergeRootAuthorReplies")
      .mockReturnValue({ replies: [], mergedTo: new Map([[replyHash, mergedHash]]) });

    const result = await getCobuildThreadMergeGroup(rootHash, replyHash);

    expect(result).toEqual(expect.arrayContaining([mergedHash, replyHash]));

    loadSpy.mockRestore();
    mapSpy.mockRestore();
    slicesSpy.mockRestore();
    mergeSpy.mockRestore();
  });
});
