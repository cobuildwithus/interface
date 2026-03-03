import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseUnits } from "viem";

vi.mock("server-only", () => ({}));

const {
  requireCliBearerAuthMock,
  getOrCreateCliAgentWalletMock,
  getOrCreateCliAgentSmartAccountMock,
  assertCliTransferAllowedMock,
  assertCliTxAllowedMock,
  txLogFindUniqueMock,
  txLogCreateMock,
  txLogUpdateMock,
} = vi.hoisted(() => ({
  requireCliBearerAuthMock: vi.fn(),
  getOrCreateCliAgentWalletMock: vi.fn(),
  getOrCreateCliAgentSmartAccountMock: vi.fn(),
  assertCliTransferAllowedMock: vi.fn(),
  assertCliTxAllowedMock: vi.fn(),
  txLogFindUniqueMock: vi.fn(),
  txLogCreateMock: vi.fn(),
  txLogUpdateMock: vi.fn(),
}));

vi.mock("@/lib/server/cli/auth", () => ({
  requireCliBearerAuth: (...args: unknown[]) => requireCliBearerAuthMock(...args),
}));

vi.mock("@/lib/server/cli/wallet-store", () => ({
  getOrCreateCliAgentWallet: (...args: unknown[]) => getOrCreateCliAgentWalletMock(...args),
  getOrCreateCliAgentSmartAccount: (...args: unknown[]) =>
    getOrCreateCliAgentSmartAccountMock(...args),
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
      },
    }),
    cliTxLog: {
      findUnique: (...args: unknown[]) => txLogFindUniqueMock(...args),
      create: (...args: unknown[]) => txLogCreateMock(...args),
      update: (...args: unknown[]) => txLogUpdateMock(...args),
    },
  },
  prismaPrimary: (client: { $primary?: () => unknown }) =>
    typeof client.$primary === "function" ? client.$primary() : client,
}));

import { POST } from "./route";

describe("cli exec route user-op failure handling", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    getOrCreateCliAgentWalletMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-smart",
      defaultNetwork: "base-sepolia",
    });

    txLogFindUniqueMock.mockResolvedValue(null);
    txLogCreateMock.mockResolvedValue({ id: 1n });
    txLogUpdateMock.mockResolvedValue({ id: 1n });
  });

  it("returns 500 and leaves transfer idempotency pending when user-op is not complete", async () => {
    const transferMock = vi.fn().mockResolvedValue({ userOpHash: "0xtransfer-user-op" });
    const waitForUserOperationMock = vi.fn().mockResolvedValue({ status: "failed" });
    getOrCreateCliAgentSmartAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000002",
      transfer: transferMock,
      sendUserOperation: vi.fn(),
      waitForUserOperation: waitForUserOperationMock,
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

    expect(transferMock).toHaveBeenCalledWith({
      to: "0x000000000000000000000000000000000000dead",
      amount: parseUnits("0.25", 6),
      token: "usdc",
      network: "base-sepolia",
    });
    expect(waitForUserOperationMock).toHaveBeenCalledWith({
      userOpHash: "0xtransfer-user-op",
    });

    expect(txLogCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "transfer",
          idempotencyKey,
          txHash: null,
        }),
      })
    );
    expect(txLogUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 500 and leaves tx idempotency pending when user-op is not complete", async () => {
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xtx-user-op" });
    const waitForUserOperationMock = vi.fn().mockResolvedValue({ status: "failed" });
    getOrCreateCliAgentSmartAccountMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000002",
      transfer: vi.fn(),
      sendUserOperation: sendUserOperationMock,
      waitForUserOperation: waitForUserOperationMock,
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
      network: "base-sepolia",
      calls: [
        {
          to: "0x000000000000000000000000000000000000dead",
          value: 0n,
          data: "0x12345678",
        },
      ],
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
          txHash: null,
        }),
      })
    );
    expect(txLogUpdateMock).not.toHaveBeenCalled();
  });
});
