import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type BuildBotCliTokenTxClient = {
  buildBotCliToken: {
    updateMany: (...args: unknown[]) => unknown;
  };
  $queryRaw: (...args: unknown[]) => unknown;
};

const { updateManyMock, queryRawMock, transactionMock, primaryMock } = vi.hoisted(() => {
  const updateManyMock = vi.fn();
  const queryRawMock = vi.fn();
  const transactionMock = vi.fn(
    async (callback: (tx: BuildBotCliTokenTxClient) => unknown | Promise<unknown>) =>
      callback({
        buildBotCliToken: {
          updateMany: (...args: unknown[]) => updateManyMock(...args),
        },
        $queryRaw: (...args: unknown[]) => queryRawMock(...args),
      })
  );
  const primaryMock = vi.fn(() => ({
    $transaction: transactionMock,
  }));

  return {
    updateManyMock,
    queryRawMock,
    transactionMock,
    primaryMock,
  };
});

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    buildBotCliToken: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    $primary: () => primaryMock(),
  },
}));

import { authenticateBuildBotCliToken } from "@/lib/server/build-bot/token-store";

describe("build-bot token store write-scope audit", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("preserves read-only scope when SQL returns canWrite=false", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    queryRawMock.mockResolvedValue([
      {
        id: 3n,
        ownerAddress: "0x000000000000000000000000000000000000dEaD",
        agentKey: "default",
        canWrite: false,
      },
    ]);

    await expect(authenticateBuildBotCliToken("bbt_read_only")).resolves.toEqual({
      tokenId: "3",
      ownerAddress: "0x000000000000000000000000000000000000dead",
      agentKey: "default",
      canWrite: false,
    });
  });

  it("defaults canWrite to true when can_write is unavailable", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    queryRawMock.mockResolvedValue([
      {
        id: 4n,
        ownerAddress: "0x000000000000000000000000000000000000dEaD",
        agentKey: "default",
      },
    ]);

    await expect(authenticateBuildBotCliToken("bbt_missing_scope")).resolves.toEqual({
      tokenId: "4",
      ownerAddress: "0x000000000000000000000000000000000000dead",
      agentKey: "default",
      canWrite: true,
    });
  });
});
