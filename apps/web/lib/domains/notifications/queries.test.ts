import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { queryRawMock, executeRawMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
  executeRawMock: vi.fn(),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    $replica: () => ({
      $queryRaw: (...args: Parameters<typeof queryRawMock>) => queryRawMock(...args),
    }),
    $primary: () => ({
      $executeRaw: (...args: Parameters<typeof executeRawMock>) => executeRawMock(...args),
    }),
  },
}));

import {
  getNotificationsPage,
  getUnreadNotificationsCount,
  markNotificationsRead,
} from "./queries";

describe("notifications queries", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
    executeRawMock.mockReset();
  });

  it("returns unread count for a wallet inbox", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 3n }]);

    await expect(
      getUnreadNotificationsCount("0x0000000000000000000000000000000000000001")
    ).resolves.toBe(3);
  });

  it("returns zero unread count when the address is invalid", async () => {
    await expect(getUnreadNotificationsCount("not-an-address")).resolves.toBe(0);
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("maps a discussion notification page into UI data", async () => {
    const sourceHash = Buffer.from("11".repeat(20), "hex");
    const rootHash = Buffer.from("22".repeat(20), "hex");
    const targetHash = Buffer.from("33".repeat(20), "hex");
    const createdAt = new Date("2026-03-08T12:00:00.000Z");

    queryRawMock
      .mockResolvedValueOnce([{ count: 1n }])
      .mockResolvedValueOnce([{ watermark: createdAt }])
      .mockResolvedValueOnce([
        {
          id: 7n,
          kind: "discussion",
          reason: "reply_to_reply",
          eventAt: createdAt,
          createdAt,
          lastReadAt: new Date("2026-03-08T11:00:00.000Z"),
          sourceHash,
          rootHash,
          targetHash,
          actorFid: 99n,
          actorUsername: "alice",
          actorDisplayName: "Alice",
          actorAvatarUrl: "https://example.com/alice.png",
          sourceText: "A reply body for the notification row.",
          rootText: "Root thread title\n\nWith more detail.",
          payload: { foo: "bar" },
        },
      ]);

    const page = await getNotificationsPage("0x0000000000000000000000000000000000000001", 1);

    expect(page.totalCount).toBe(1);
    expect(page.totalPages).toBe(1);
    expect(page.items).toEqual([
      expect.objectContaining({
        id: "7",
        kind: "discussion",
        reason: "reply_to_reply",
        href: `/cast/0x${rootHash.toString("hex")}?post=0x${sourceHash.toString("hex")}`,
        sourceHash: `0x${sourceHash.toString("hex")}`,
        rootHash: `0x${rootHash.toString("hex")}`,
        targetHash: `0x${targetHash.toString("hex")}`,
        rootTitle: "Root thread title",
        sourceExcerpt: "A reply body for the notification row.",
        isUnread: true,
        actor: {
          fid: 99,
          name: "alice",
          username: "alice",
          avatarUrl: "https://example.com/alice.png",
        },
      }),
    ]);
    expect(page.watermark).toBe(createdAt.toISOString());
  });

  it("returns an empty page when the address is invalid", async () => {
    await expect(getNotificationsPage("not-an-address", 1)).resolves.toEqual({
      items: [],
      page: 1,
      totalPages: 0,
      totalCount: 0,
      watermark: expect.any(String),
    });
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("marks notifications as read with a DB cursor update", async () => {
    executeRawMock.mockResolvedValueOnce(1);

    await markNotificationsRead(
      "0x0000000000000000000000000000000000000001",
      new Date("2026-03-08T12:00:00.000Z")
    );

    expect(executeRawMock).toHaveBeenCalledTimes(1);
  });

  it("skips DB writes when the watermark is invalid", async () => {
    await markNotificationsRead("0x0000000000000000000000000000000000000001", new Date("invalid"));

    expect(executeRawMock).not.toHaveBeenCalled();
  });
});
