import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const queryRawMock = vi.fn();
const mapCastRowToFarcasterCastMock = vi.fn();
const getPrimaryAttachmentMock = vi.fn();
const getTitleAndExcerptMock = vi.fn();

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    $replica: () => ({
      $queryRaw: (...args: unknown[]) => queryRawMock(...args),
    }),
  },
}));

vi.mock("@/lib/domains/rounds/cast-mappers", () => ({
  mapCastRowToFarcasterCast: (...args: unknown[]) => mapCastRowToFarcasterCastMock(...args),
}));

vi.mock("./attachments", () => ({
  getPrimaryAttachment: (...args: unknown[]) => getPrimaryAttachmentMock(...args),
  getTitleAndExcerpt: (...args: unknown[]) => getTitleAndExcerptMock(...args),
}));

import { getCobuildDiscussionCastsPage } from "./discussion";

function createRow(overrides: Record<string, unknown> = {}) {
  return {
    hash: Buffer.from("aa".repeat(20), "hex"),
    text: "A cast",
    castTimestamp: new Date("2025-01-01T00:00:00.000Z"),
    embedsArray: null,
    embedSummaries: ["summary-1"],
    mentionsPositions: [],
    mentionProfiles: [],
    fid: 123n,
    authorFname: "alice",
    authorDisplayName: "Alice",
    authorAvatarUrl: "https://cdn.example.com/alice.png",
    authorNeynarScore: 0.9,
    aiOutputId: null,
    aiOutputModel: null,
    aiOutputOutput: null,
    aiOutputCreatedAt: null,
    evalShare: null,
    evalRank: null,
    evalWinRate: null,
    replyCount: 1,
    viewCount: 2,
    lastReplyTimestamp: null,
    lastReplyAuthorFname: null,
    ...overrides,
  };
}

describe("getCobuildDiscussionCastsPage", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
    mapCastRowToFarcasterCastMock.mockReset();
    getPrimaryAttachmentMock.mockReset();
    getTitleAndExcerptMock.mockReset();
  });

  it("maps and paginates rows while filtering empty-text rows", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 5n }]).mockResolvedValueOnce([
      createRow({
        text: "Row 1",
        replyCount: "3",
        viewCount: 99n,
        lastReplyTimestamp: new Date("2025-01-02T03:04:05.000Z"),
        lastReplyAuthorFname: null,
      }),
      createRow({
        hash: Buffer.from("bb".repeat(20), "hex"),
        text: "   ",
      }),
      createRow({
        hash: Buffer.from("cc".repeat(20), "hex"),
        text: "Row 3 (excluded by page slice)",
      }),
    ]);

    mapCastRowToFarcasterCastMock.mockImplementation((row: { hash: Buffer; text: string }) => ({
      hash: `0x${row.hash.toString("hex")}`,
      text: `mapped:${row.text}`,
      timestamp: "2025-01-01T00:00:00.000Z",
      author: { username: "alice" },
      embeds: [{ url: "https://example.com/post/1" }],
    }));
    getPrimaryAttachmentMock.mockReturnValue({
      kind: "link",
      url: "https://example.com/post/1",
      label: "example.com",
      sourceUrl: "https://example.com/post/1",
    });
    getTitleAndExcerptMock.mockReturnValue({
      title: "Title",
      excerpt: "Excerpt",
    });

    const result = await getCobuildDiscussionCastsPage(2, 0, "last", "desc");

    expect(result.totalCount).toBe(5);
    expect(result.totalPages).toBe(3);
    expect(result.hasMore).toBe(true);
    expect(result.items).toEqual([
      {
        hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        title: "Title",
        excerpt: "Excerpt",
        text: "mapped:Row 1",
        author: { username: "alice" },
        createdAt: "2025-01-01T00:00:00.000Z",
        replyCount: 3,
        viewCount: 99,
        attachment: {
          kind: "link",
          url: "https://example.com/post/1",
          label: "example.com",
          sourceUrl: "https://example.com/post/1",
        },
        lastReply: {
          createdAt: "2025-01-02T03:04:05.000Z",
          authorUsername: "unknown",
        },
      },
    ]);
    expect(mapCastRowToFarcasterCastMock).toHaveBeenCalledTimes(1);
    expect(getPrimaryAttachmentMock).toHaveBeenCalledWith(
      [{ url: "https://example.com/post/1" }],
      ["summary-1"]
    );
    expect(getTitleAndExcerptMock).toHaveBeenCalledWith("mapped:Row 1");
  });

  it("normalizes valid embed URLs and omits embed filter for invalid URLs", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 0n }]).mockResolvedValueOnce([]);

    const validResult = await getCobuildDiscussionCastsPage(
      5,
      0,
      "views",
      "asc",
      " https://example.com/path///?q=1#fragment "
    );
    expect(validResult).toEqual({
      items: [],
      hasMore: false,
      totalCount: 0,
      totalPages: 0,
    });
    expect(queryRawMock).toHaveBeenCalledTimes(2);

    queryRawMock.mockReset();
    queryRawMock.mockResolvedValueOnce([{ count: 0n }]).mockResolvedValueOnce([]);

    const invalidResult = await getCobuildDiscussionCastsPage(
      5,
      0,
      "views",
      "asc",
      "ftp://example.com/path"
    );
    expect(invalidResult).toEqual({
      items: [],
      hasMore: false,
      totalCount: 0,
      totalPages: 0,
    });
    expect(queryRawMock).toHaveBeenCalledTimes(2);
  });
});
