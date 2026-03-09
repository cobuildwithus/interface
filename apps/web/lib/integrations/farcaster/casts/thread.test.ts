import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  getCobuildActivityByFidsMock,
  loadCobuildCastsByHashesMock,
  loadCobuildRootCastRowMock,
  loadCobuildThreadFocusIndexMock,
  loadCobuildThreadRepliesPageMock,
  mapThreadRowsMock,
} = vi.hoisted(() => ({
  getCobuildActivityByFidsMock: vi.fn(),
  loadCobuildCastsByHashesMock: vi.fn(),
  loadCobuildRootCastRowMock: vi.fn(),
  loadCobuildThreadFocusIndexMock: vi.fn(),
  loadCobuildThreadRepliesPageMock: vi.fn(),
  mapThreadRowsMock: vi.fn(),
}));

vi.mock("@/lib/integrations/farcaster/activity", () => ({
  getCobuildActivityByFids: (...args: unknown[]) => getCobuildActivityByFidsMock(...args),
}));

vi.mock("./thread/helpers", () => ({
  loadCobuildCastsByHashes: (...args: unknown[]) => loadCobuildCastsByHashesMock(...args),
  loadCobuildRootCastRow: (...args: unknown[]) => loadCobuildRootCastRowMock(...args),
  loadCobuildThreadFocusIndex: (...args: unknown[]) => loadCobuildThreadFocusIndexMock(...args),
  loadCobuildThreadRepliesPage: (...args: unknown[]) => loadCobuildThreadRepliesPageMock(...args),
  loadCobuildThreadRows: vi.fn(),
  mapThreadRows: (...args: unknown[]) => mapThreadRowsMock(...args),
  mergeRootAuthorReplies: (replies: unknown) => ({ replies, mergedTo: new Map() }),
}));

import { getCobuildFlatCastThread } from "./thread";

function createRootRow() {
  return {
    hash: Buffer.from("11".repeat(20), "hex"),
    text: "",
    castTimestamp: new Date("2026-03-09T00:00:00.000Z"),
    embedsArray: [],
    embedSummaries: [],
    mentionsPositions: [],
    mentionProfiles: [],
    fid: 1n,
    authorFname: "alice",
    authorDisplayName: "Alice",
    authorAvatarUrl: null,
    authorNeynarScore: 0.9,
    aiOutputId: null,
    aiOutputModel: null,
    aiOutputOutput: null,
    aiOutputCreatedAt: null,
    evalShare: null,
    evalRank: null,
    evalWinRate: null,
    parentHash: null,
    viewCount: 0n,
    hiddenAt: null,
    hiddenReason: null,
  };
}

describe("getCobuildFlatCastThread", () => {
  beforeEach(() => {
    getCobuildActivityByFidsMock.mockReset();
    loadCobuildCastsByHashesMock.mockReset();
    loadCobuildRootCastRowMock.mockReset();
    loadCobuildThreadFocusIndexMock.mockReset();
    loadCobuildThreadRepliesPageMock.mockReset();
    mapThreadRowsMock.mockReset();

    getCobuildActivityByFidsMock.mockResolvedValue(new Map());
    loadCobuildCastsByHashesMock.mockResolvedValue([]);
    loadCobuildThreadFocusIndexMock.mockResolvedValue({ mergeTarget: null, index: null });
    loadCobuildThreadRepliesPageMock.mockResolvedValue({ rows: [], replyCount: 0 });
  });

  it("returns a thread for a mention-only root post without replies", async () => {
    const rootRow = createRootRow();
    loadCobuildRootCastRowMock.mockResolvedValue(rootRow);
    mapThreadRowsMock
      .mockReturnValueOnce([
        {
          hash: "0x1111111111111111111111111111111111111111",
          parentHash: null,
          text: "@alice",
          author: { fid: 1, neynar_score: 0.9 },
          createdAt: "2026-03-09T00:00:00.000Z",
          attachment: null,
          viewCount: 0,
        },
      ])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([]);

    const thread = await getCobuildFlatCastThread("0x1111111111111111111111111111111111111111");

    expect(thread?.root.text).toBe("@alice");
    expect(thread?.replies).toEqual([]);
  });

  it("returns a thread for an attachment-only root post without replies", async () => {
    const rootRow = createRootRow();
    loadCobuildRootCastRowMock.mockResolvedValue(rootRow);
    mapThreadRowsMock
      .mockReturnValueOnce([
        {
          hash: "0x1111111111111111111111111111111111111111",
          parentHash: null,
          text: "",
          author: { fid: 1, neynar_score: 0.9 },
          createdAt: "2026-03-09T00:00:00.000Z",
          attachment: {
            kind: "link",
            url: "https://example.com/post",
            label: "example.com",
            sourceUrl: "https://example.com/post",
          },
          viewCount: 0,
        },
      ])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([]);

    const thread = await getCobuildFlatCastThread("0x1111111111111111111111111111111111111111");

    expect(thread?.root.attachment).toEqual({
      kind: "link",
      url: "https://example.com/post",
      label: "example.com",
      sourceUrl: "https://example.com/post",
    });
    expect(thread?.replies).toEqual([]);
  });
});
