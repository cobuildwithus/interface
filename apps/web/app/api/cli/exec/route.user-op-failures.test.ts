import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  requireCliBearerAuthMock,
  getCliAgentWalletMock,
  getOrCreateCliAgentExecutionContextMock,
  assertCliTransferAllowedMock,
  assertCliTxAllowedMock,
  txLogFindUniqueMock,
  txLogCreateMock,
  txLogUpdateMock,
  txLogUpdateManyMock,
} = vi.hoisted(() => ({
  requireCliBearerAuthMock: vi.fn(),
  getCliAgentWalletMock: vi.fn(),
  getOrCreateCliAgentExecutionContextMock: vi.fn(),
  assertCliTransferAllowedMock: vi.fn(),
  assertCliTxAllowedMock: vi.fn(),
  txLogFindUniqueMock: vi.fn(),
  txLogCreateMock: vi.fn(),
  txLogUpdateMock: vi.fn(),
  txLogUpdateManyMock: vi.fn(),
}));

vi.mock("@/lib/server/cli/auth", () => ({
  requireCliBearerAuth: (...args: unknown[]) => requireCliBearerAuthMock(...args),
}));

vi.mock("@/lib/server/cli/wallet-store", () => ({
  getCliAgentWallet: (...args: unknown[]) => getCliAgentWalletMock(...args),
  getOrCreateCliAgentExecutionContext: (...args: unknown[]) =>
    getOrCreateCliAgentExecutionContextMock(...args),
}));

vi.mock("@/lib/server/cli/policy", () => ({
  assertCliTransferAllowed: (...args: unknown[]) => assertCliTransferAllowedMock(...args),
  assertCliTxAllowed: (...args: unknown[]) => assertCliTxAllowedMock(...args),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    $primary: () => ({
      cliTxLog: {
        findUnique: (...args: unknown[]) => txLogFindUniqueMock(...args),
        create: (...args: unknown[]) => txLogCreateMock(...args),
        update: (...args: unknown[]) => txLogUpdateMock(...args),
        updateMany: (...args: unknown[]) => txLogUpdateManyMock(...args),
      },
    }),
    cliTxLog: {
      findUnique: (...args: unknown[]) => txLogFindUniqueMock(...args),
      create: (...args: unknown[]) => txLogCreateMock(...args),
      update: (...args: unknown[]) => txLogUpdateMock(...args),
      updateMany: (...args: unknown[]) => txLogUpdateManyMock(...args),
    },
  },
  prismaPrimary: (client: { $primary?: () => unknown }) =>
    typeof client.$primary === "function" ? client.$primary() : client,
}));

import { POST } from "./route";

const BASE_BUILDER_SUFFIX = "0x0b62635f64647972736c69780080218021802180218021802180218021";

describe("cli exec route user-op failure handling", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    getCliAgentWalletMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-smart",
      defaultNetwork: "base",
    });

    txLogFindUniqueMock.mockResolvedValue(null);
    txLogCreateMock.mockResolvedValue({ id: 1n });
    txLogUpdateMock.mockResolvedValue({ id: 1n });
    txLogUpdateManyMock.mockResolvedValue({ count: 1 });
  });

  it("returns 500 and marks transfer idempotency failed when user-op settles unsuccessfully", async () => {
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xtransfer-user-op" });
    const waitForUserOperationMock = vi.fn().mockResolvedValue({ status: "failed" });
    getOrCreateCliAgentExecutionContextMock.mockResolvedValue({
      wallet: {
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
        cdpAccountName: "cli-smart",
        address: "0x0000000000000000000000000000000000000002",
        defaultNetwork: "base",
      },
      smartAccount: {
        address: "0x0000000000000000000000000000000000000002",
        sendUserOperation: sendUserOperationMock,
        waitForUserOperation: waitForUserOperationMock,
      },
      walletAddress: "0x0000000000000000000000000000000000000002",
    });

    const idempotencyKey = "b5aa9e58-5de9-4f75-b5fd-efef14930f72";
    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        kind: "transfer",
        token: "usdc",
        amount: "0.25",
        to: "0x000000000000000000000000000000000000dEaD",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      error: "User operation failed before confirmation",
    });

    expect(sendUserOperationMock).toHaveBeenCalledWith({
      network: "base",
      calls: [
        expect.objectContaining({
          value: 0n,
        }),
      ],
      dataSuffix: BASE_BUILDER_SUFFIX,
      idempotencyKey,
    });
    const transferCall = (
      sendUserOperationMock.mock.calls[0]?.[0] as {
        calls?: Array<{ data?: string; to?: string }>;
      }
    )?.calls?.[0];
    expect(transferCall?.to?.toLowerCase()).toBe("0x833589fcd6edb6e08f4c7c32d4f71b54bda02913");
    expect(transferCall?.data?.endsWith(BASE_BUILDER_SUFFIX.slice(2))).toBe(false);
    expect(waitForUserOperationMock).toHaveBeenCalledWith({
      userOpHash: "0xtransfer-user-op",
    });

    expect(txLogCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "transfer",
          idempotencyKey,
          status: "pending",
          txHash: null,
          userOpHash: null,
          expiresAt: expect.any(Date),
        }),
      })
    );
    expect(txLogUpdateMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: {
          status: "submitted",
          userOpHash: "0xtransfer-user-op",
          expiresAt: null,
        },
      })
    );
    expect(txLogUpdateMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: {
          status: "failed",
          expiresAt: null,
        },
      })
    );
  });

  it("returns 500 and marks tx idempotency failed when user-op settles unsuccessfully", async () => {
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xtx-user-op" });
    const waitForUserOperationMock = vi.fn().mockResolvedValue({ status: "failed" });
    getOrCreateCliAgentExecutionContextMock.mockResolvedValue({
      wallet: {
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
        cdpAccountName: "cli-smart",
        address: "0x0000000000000000000000000000000000000002",
        defaultNetwork: "base",
      },
      smartAccount: {
        address: "0x0000000000000000000000000000000000000002",
        sendUserOperation: sendUserOperationMock,
        waitForUserOperation: waitForUserOperationMock,
      },
      walletAddress: "0x0000000000000000000000000000000000000002",
    });

    const idempotencyKey = "b64db2c3-e6d4-44ac-98af-5f15387f383d";
    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        valueEth: "0",
        data: "0x12345678",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      error: "User operation failed before confirmation",
    });

    expect(sendUserOperationMock).toHaveBeenCalledWith({
      network: "base",
      calls: [
        {
          to: "0x000000000000000000000000000000000000dead",
          value: 0n,
          data: "0x12345678",
        },
      ],
      dataSuffix: BASE_BUILDER_SUFFIX,
      idempotencyKey,
    });
    expect(waitForUserOperationMock).toHaveBeenCalledWith({
      userOpHash: "0xtx-user-op",
    });

    expect(txLogCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "tx",
          idempotencyKey,
          status: "pending",
          txHash: null,
          userOpHash: null,
          expiresAt: expect.any(Date),
        }),
      })
    );
    expect(txLogUpdateMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: {
          status: "submitted",
          userOpHash: "0xtx-user-op",
          expiresAt: null,
        },
      })
    );
    expect(txLogUpdateMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: {
          status: "failed",
          expiresAt: null,
        },
      })
    );
  });
});
