import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type BuildBotCliTokenTxClient = {
  buildBotCliToken: {
    updateMany: (...args: unknown[]) => unknown;
    findFirst: (...args: unknown[]) => unknown;
  };
};

const { findManyMock, createMock, updateManyMock, findFirstMock, transactionMock, primaryMock } =
  vi.hoisted(() => {
    const findManyMock = vi.fn();
    const createMock = vi.fn();
    const updateManyMock = vi.fn();
    const findFirstMock = vi.fn();
    const transactionMock = vi.fn(
      async (callback: (tx: BuildBotCliTokenTxClient) => unknown | Promise<unknown>) =>
        callback({
          buildBotCliToken: {
            updateMany: (...args: unknown[]) => updateManyMock(...args),
            findFirst: (...args: unknown[]) => findFirstMock(...args),
          },
        })
    );
    const primaryMock = vi.fn(() => ({
      $transaction: transactionMock,
    }));

    return {
      findManyMock,
      createMock,
      updateManyMock,
      findFirstMock,
      transactionMock,
      primaryMock,
    };
  });

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    buildBotCliToken: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      create: (...args: unknown[]) => createMock(...args),
      updateMany: (...args: unknown[]) => updateManyMock(...args),
      findFirst: (...args: unknown[]) => findFirstMock(...args),
    },
    $primary: () => primaryMock(),
  },
}));

import {
  authenticateBuildBotCliToken,
  createBuildBotCliToken,
  hashBuildBotToken,
  listBuildBotCliTokens,
  revokeBuildBotCliToken,
} from "@/lib/server/build-bot/token-store";

describe("build-bot token store", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("lists active tokens for an owner and maps ids/dates", async () => {
    const createdAt = new Date("2026-02-24T12:00:00.000Z");
    const lastUsedAt = new Date("2026-02-24T13:00:00.000Z");
    findManyMock.mockResolvedValue([
      {
        id: 9n,
        agentKey: "default",
        label: "laptop",
        createdAt,
        lastUsedAt,
      },
    ]);

    const result = await listBuildBotCliTokens("0x000000000000000000000000000000000000dEaD");

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        ownerAddress: "0x000000000000000000000000000000000000dead",
        revokedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        agentKey: true,
        label: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    expect(result).toEqual([
      {
        id: "9",
        agentKey: "default",
        label: "laptop",
        createdAt: createdAt.toISOString(),
        lastUsedAt: lastUsedAt.toISOString(),
      },
    ]);
  });

  it("creates a token with only hashed secret persisted", async () => {
    const createdAt = new Date("2026-02-24T12:00:00.000Z");
    createMock.mockResolvedValue({
      id: 42n,
      agentKey: "default",
      label: "cli",
      createdAt,
      lastUsedAt: null,
    });

    const created = await createBuildBotCliToken({
      ownerAddress: "0x000000000000000000000000000000000000dEaD",
      label: "  cli  ",
    });

    expect(created.token).toMatch(/^bbt_[A-Za-z0-9_-]+$/);
    expect(created.tokenInfo).toEqual({
      id: "42",
      agentKey: "default",
      label: "cli",
      createdAt: createdAt.toISOString(),
      lastUsedAt: null,
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerAddress: "0x000000000000000000000000000000000000dead",
          agentKey: "default",
          label: "cli",
          tokenHash: hashBuildBotToken(created.token),
        }),
      })
    );

    const createArgs = createMock.mock.calls[0]?.[0] as { data: { tokenHash: string } };
    expect(createArgs.data.tokenHash).not.toContain(created.token);
  });

  it("normalizes empty labels to null", async () => {
    createMock.mockResolvedValue({
      id: 1n,
      agentKey: "default",
      label: null,
      createdAt: new Date("2026-02-24T12:00:00.000Z"),
      lastUsedAt: null,
    });

    await createBuildBotCliToken({
      ownerAddress: "0x000000000000000000000000000000000000dEaD",
      label: "   ",
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          label: null,
        }),
      })
    );
  });

  it("revokes token ids that parse to bigint", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });

    await expect(
      revokeBuildBotCliToken({
        ownerAddress: "0x000000000000000000000000000000000000dEaD",
        tokenId: "7",
      })
    ).resolves.toBe(true);

    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        id: 7n,
        ownerAddress: "0x000000000000000000000000000000000000dead",
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });

  it("short-circuits revoke on invalid token ids", async () => {
    await expect(
      revokeBuildBotCliToken({
        ownerAddress: "0x000000000000000000000000000000000000dEaD",
        tokenId: "not-a-number",
      })
    ).resolves.toBe(false);

    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("authenticates a valid token and updates last-used timestamp", async () => {
    const rawToken = "bbt_test-token";
    updateManyMock.mockResolvedValue({
      count: 1,
    });
    findFirstMock.mockResolvedValue({
      id: 11n,
      ownerAddress: "0x000000000000000000000000000000000000dEaD",
      agentKey: "default",
    });

    await expect(authenticateBuildBotCliToken(rawToken)).resolves.toEqual({
      tokenId: "11",
      ownerAddress: "0x000000000000000000000000000000000000dead",
      agentKey: "default",
    });

    expect(primaryMock).toHaveBeenCalledTimes(1);
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        tokenHash: hashBuildBotToken(rawToken),
        revokedAt: null,
      },
      data: {
        lastUsedAt: expect.any(Date),
      },
    });

    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        tokenHash: hashBuildBotToken(rawToken),
        revokedAt: null,
      },
      select: {
        id: true,
        ownerAddress: true,
        agentKey: true,
      },
    });
  });

  it("returns null and skips update for invalid tokens", async () => {
    updateManyMock.mockResolvedValue({
      count: 0,
    });

    await expect(authenticateBuildBotCliToken("bbt_missing")).resolves.toBeNull();
    expect(findFirstMock).not.toHaveBeenCalled();
  });
});
