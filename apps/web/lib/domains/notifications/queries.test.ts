import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { replicaQueryRawMock, primaryQueryRawMock, executeRawMock, transactionMock } = vi.hoisted(
  () => ({
    replicaQueryRawMock: vi.fn(),
    primaryQueryRawMock: vi.fn(),
    executeRawMock: vi.fn(),
    transactionMock: vi.fn(),
  })
);

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    $replica: () => ({
      $queryRaw: (...args: Parameters<typeof replicaQueryRawMock>) => replicaQueryRawMock(...args),
    }),
    $primary: () => {
      const txClient = {
        $queryRaw: (...args: Parameters<typeof primaryQueryRawMock>) =>
          primaryQueryRawMock(...args),
      };
      return {
        $queryRaw: (...args: Parameters<typeof primaryQueryRawMock>) =>
          primaryQueryRawMock(...args),
        $executeRaw: (...args: Parameters<typeof executeRawMock>) => executeRawMock(...args),
        $transaction: (callback: (tx: typeof txClient) => Promise<unknown>, options?: unknown) =>
          transactionMock(callback, options, txClient),
      };
    },
  },
}));

import {
  getNotificationsPage,
  getUnreadNotificationsState,
  getUnreadNotificationsCount,
  markNotificationsRead,
} from "./queries";
import { Prisma } from "@/generated/prisma/client";

describe("notifications queries", () => {
  beforeEach(() => {
    replicaQueryRawMock.mockReset();
    primaryQueryRawMock.mockReset();
    executeRawMock.mockReset();
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (callback, _options, txClient) => callback(txClient));
  });

  it("returns unread count for a wallet inbox", async () => {
    replicaQueryRawMock.mockResolvedValueOnce([{ count: 3n, watermark: "1741435200000001:7" }]);

    await expect(
      getUnreadNotificationsCount("0x0000000000000000000000000000000000000001")
    ).resolves.toBe(3);
  });

  it("returns unread watermark state for a wallet inbox", async () => {
    replicaQueryRawMock.mockResolvedValueOnce([{ count: 2n, watermark: "1741435200000003:9" }]);

    await expect(
      getUnreadNotificationsState("0x0000000000000000000000000000000000000001")
    ).resolves.toEqual({
      count: 2,
      watermark: "1741435200000003:9",
    });
  });

  it("returns zero unread count when the address is invalid", async () => {
    await expect(getUnreadNotificationsCount("not-an-address")).resolves.toBe(0);
    expect(replicaQueryRawMock).not.toHaveBeenCalled();
  });

  it("returns inbox unread count even when the current page rows are already read", async () => {
    const sourceHash = Buffer.from("11".repeat(20), "hex");
    const rootHash = Buffer.from("22".repeat(20), "hex");
    const targetHash = Buffer.from("33".repeat(20), "hex");
    const createdAt = new Date("2026-03-08T12:00:00.000Z");

    primaryQueryRawMock
      .mockResolvedValueOnce([{ count: 2n, watermark: "1741435200000001:7" }])
      .mockResolvedValueOnce([{ count: 1n }])
      .mockResolvedValueOnce([{ watermark: "1741435200000001:7" }])
      .mockResolvedValueOnce([
        {
          id: 7n,
          kind: "discussion",
          reason: "reply_to_reply",
          eventAt: createdAt,
          createdAt,
          lastReadAt: new Date("2026-03-08T13:00:00.000Z"),
          isUnread: false,
          sourceHash,
          rootHash,
          targetHash,
          actorFid: 99n,
          actorUsername: "alice",
          actorDisplayName: "Alice",
          actorAvatarUrl: "https://example.com/alice.png",
          sourceText: "",
          sourceMentionsPositions: [0],
          sourceMentionProfiles: [{ fid: 123, fname: "alice" }],
          rootText: "",
          rootMentionsPositions: [0],
          rootMentionProfiles: [{ fid: 456, fname: "topic-owner" }],
          payload: { foo: "bar" },
        },
      ]);

    const page = await getNotificationsPage("0x0000000000000000000000000000000000000001", 1);

    expect(page.totalCount).toBe(1);
    expect(page.totalPages).toBe(1);
    expect(page.unreadCount).toBe(2);
    expect(page.items).toEqual([
      expect.objectContaining({
        id: "7",
        kind: "discussion",
        reason: "reply_to_reply",
        href: `/cast/0x${rootHash.toString("hex")}?post=0x${sourceHash.toString("hex")}`,
        sourceHash: `0x${sourceHash.toString("hex")}`,
        rootHash: `0x${rootHash.toString("hex")}`,
        targetHash: `0x${targetHash.toString("hex")}`,
        rootTitle: "@topic-owner",
        sourceExcerpt: "@alice",
        isUnread: false,
        actor: {
          fid: 99,
          name: "alice",
          username: "alice",
          avatarUrl: "https://example.com/alice.png",
        },
      }),
    ]);
    expect(page.watermark).toBe("1741435200000001:7");
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(transactionMock.mock.calls[0]?.[1]).toEqual({
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  });

  it("returns an empty page when the address is invalid", async () => {
    await expect(getNotificationsPage("not-an-address", 1)).resolves.toEqual({
      items: [],
      page: 1,
      totalPages: 0,
      totalCount: 0,
      unreadCount: 0,
      watermark: "0:0",
    });
    expect(primaryQueryRawMock).not.toHaveBeenCalled();
  });

  it("marks notifications as read with an opaque watermark cursor", async () => {
    executeRawMock.mockResolvedValueOnce(1);

    await markNotificationsRead("0x0000000000000000000000000000000000000001", "1741435200000001:7");

    expect(executeRawMock).toHaveBeenCalledTimes(1);
  });

  it("skips DB writes when the watermark is invalid", async () => {
    await markNotificationsRead("0x0000000000000000000000000000000000000001", "bad-watermark");

    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("keeps full normalized source excerpt text for notification previews", async () => {
    const sourceHash = Buffer.from("44".repeat(20), "hex");
    const rootHash = Buffer.from("55".repeat(20), "hex");
    const createdAt = new Date("2026-03-08T12:00:00.000Z");
    const longSourceText =
      "first line with detail\nsecond line keeps going with more context and should not be cut off by the query mapper even when it gets long enough to previously trigger truncation";

    primaryQueryRawMock
      .mockResolvedValueOnce([{ count: 0n, watermark: "1741435200000001:8" }])
      .mockResolvedValueOnce([{ count: 1n }])
      .mockResolvedValueOnce([{ watermark: "1741435200000001:8" }])
      .mockResolvedValueOnce([
        {
          id: 8n,
          kind: "discussion",
          reason: "reply_to_root",
          eventAt: createdAt,
          createdAt,
          lastReadAt: null,
          isUnread: true,
          sourceHash,
          rootHash,
          targetHash: null,
          actorFid: 42n,
          actorUsername: "builder",
          actorDisplayName: "Builder",
          actorAvatarUrl: null,
          sourceText: longSourceText,
          sourceMentionsPositions: [],
          sourceMentionProfiles: [],
          rootText: "discussion focused Farcaster client",
          rootMentionsPositions: [],
          rootMentionProfiles: [],
          payload: null,
        },
      ]);

    const page = await getNotificationsPage("0x0000000000000000000000000000000000000001", 1);

    expect(page.items[0]?.sourceExcerpt).toBe(
      "first line with detail second line keeps going with more context and should not be cut off by the query mapper even when it gets long enough to previously trigger truncation"
    );
  });

  it("preserves protocol actor labels when only actor_wallet_address is present", async () => {
    const createdAt = new Date("2026-03-08T12:00:00.000Z");

    primaryQueryRawMock
      .mockResolvedValueOnce([{ count: 1n, watermark: "1741435200000001:9" }])
      .mockResolvedValueOnce([{ count: 1n }])
      .mockResolvedValueOnce([{ watermark: "1741435200000001:9" }])
      .mockResolvedValueOnce([
        {
          id: 9n,
          kind: "protocol",
          reason: "budget_proposed",
          eventAt: createdAt,
          createdAt,
          lastReadAt: null,
          isUnread: true,
          sourceHash: null,
          rootHash: null,
          targetHash: null,
          actorFid: null,
          actorWalletAddress: "0x00000000000000000000000000000000000000aa",
          actorUsername: null,
          actorDisplayName: null,
          actorAvatarUrl: null,
          sourceText: null,
          sourceMentionsPositions: null,
          sourceMentionProfiles: null,
          rootText: null,
          rootMentionsPositions: null,
          rootMentionProfiles: null,
          payload: {
            labels: { goalName: "Alpha" },
            resource: {
              goalTreasury: "0x00000000000000000000000000000000000000bb",
            },
          },
        },
      ]);

    const page = await getNotificationsPage("0x0000000000000000000000000000000000000001", 1);

    expect(page.items[0]).toEqual(
      expect.objectContaining({
        kind: "protocol",
        actor: {
          fid: null,
          name: "0x0000...00aa",
          username: null,
          avatarUrl: null,
        },
        rootTitle: "New budget proposed in Alpha.",
        sourceExcerpt: "0x0000...00aa opened a new budget request.",
        href: "/0x00000000000000000000000000000000000000bb/events?focus=request",
      })
    );
  });

  it("uses allocate-focused links for actionable premium notifications", async () => {
    const createdAt = new Date("2026-03-08T12:00:00.000Z");

    primaryQueryRawMock
      .mockResolvedValueOnce([{ count: 1n, watermark: "1741435200000001:10" }])
      .mockResolvedValueOnce([{ count: 1n }])
      .mockResolvedValueOnce([{ watermark: "1741435200000001:10" }])
      .mockResolvedValueOnce([
        {
          id: 10n,
          kind: "protocol",
          reason: "premium_claimable",
          eventAt: createdAt,
          createdAt,
          lastReadAt: null,
          isUnread: true,
          sourceHash: null,
          rootHash: null,
          targetHash: null,
          actorFid: null,
          actorWalletAddress: null,
          actorUsername: null,
          actorDisplayName: null,
          actorAvatarUrl: null,
          sourceText: null,
          sourceMentionsPositions: null,
          sourceMentionProfiles: null,
          rootText: null,
          rootMentionsPositions: null,
          rootMentionProfiles: null,
          payload: {
            labels: { goalName: "Alpha" },
            resource: {
              goalTreasury: "0x00000000000000000000000000000000000000bb",
              budgetTreasury: "0x00000000000000000000000000000000000000cc",
            },
          },
        },
      ]);

    const page = await getNotificationsPage("0x0000000000000000000000000000000000000001", 1);

    expect(page.items[0]).toEqual(
      expect.objectContaining({
        rootTitle: "Premium ready to claim in Alpha.",
        sourceExcerpt: "Premium is now claimable on this underwriting position.",
        href: "/0x00000000000000000000000000000000000000bb/allocate?budgetTreasury=0x00000000000000000000000000000000000000cc&focus=premium",
      })
    );
  });

  it("uses dispute-focused links for scheduled juror notifications", async () => {
    const createdAt = new Date("2026-03-08T12:00:00.000Z");

    primaryQueryRawMock
      .mockResolvedValueOnce([{ count: 1n, watermark: "1741435200000001:11" }])
      .mockResolvedValueOnce([{ count: 1n }])
      .mockResolvedValueOnce([{ watermark: "1741435200000001:11" }])
      .mockResolvedValueOnce([
        {
          id: 11n,
          kind: "protocol",
          reason: "juror_voting_open",
          eventAt: createdAt,
          createdAt,
          lastReadAt: null,
          isUnread: true,
          sourceHash: null,
          rootHash: null,
          targetHash: null,
          actorFid: null,
          actorWalletAddress: null,
          actorUsername: null,
          actorDisplayName: null,
          actorAvatarUrl: null,
          sourceText: null,
          sourceMentionsPositions: null,
          sourceMentionProfiles: null,
          rootText: null,
          rootMentionsPositions: null,
          rootMentionProfiles: null,
          payload: {
            labels: { goalName: "Alpha" },
            resource: {
              goalTreasury: "0x00000000000000000000000000000000000000bb",
              budgetTreasury: "0x00000000000000000000000000000000000000cc",
              arbitrator: "0x00000000000000000000000000000000000000dd",
              disputeId: "7",
            },
            schedule: {
              deliverAt: "2026-03-08T12:00:00.000Z",
              votingStartAt: "2026-03-08T12:00:00.000Z",
              votingEndAt: "2026-03-09T12:00:00.000Z",
              revealEndAt: "2026-03-10T12:00:00.000Z",
            },
          },
        },
      ]);

    const page = await getNotificationsPage("0x0000000000000000000000000000000000000001", 1);

    expect(page.items[0]).toEqual(
      expect.objectContaining({
        rootTitle: "Juror voting opened in Alpha.",
        sourceExcerpt: "Voting is now open on this dispute.",
        href: "/0x00000000000000000000000000000000000000bb/events?budgetTreasury=0x00000000000000000000000000000000000000cc&disputeId=7&arbitrator=0x00000000000000000000000000000000000000dd&focus=dispute",
      })
    );
  });
});
