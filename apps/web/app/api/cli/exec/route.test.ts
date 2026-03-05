import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

import { CliAuthError, CliConfigError, CliPolicyError } from "@/lib/server/cli/errors";
import { POST } from "./route";

const BASE_BUILDER_SUFFIX = "0x0b62635f64647972736c69780080218021802180218021802180218021";
const TX_DATA_WITH_BUILDER_SUFFIX = `0x12345678${BASE_BUILDER_SUFFIX.slice(2)}`;

describe("cli exec route", () => {
  function setSmartAccountMocks(params: {
    transferMock?: ReturnType<typeof vi.fn>;
    sendUserOperationMock?: ReturnType<typeof vi.fn>;
    waitForUserOperationMock?: ReturnType<typeof vi.fn>;
    address?: string;
  }) {
    const transferMock =
      params.transferMock ?? vi.fn().mockResolvedValue({ userOpHash: "0xtransfer-user-op" });
    const sendUserOperationMock =
      params.sendUserOperationMock ?? vi.fn().mockResolvedValue({ userOpHash: "0xtx-user-op" });
    const waitForUserOperationMock =
      params.waitForUserOperationMock ??
      vi.fn().mockResolvedValue({ status: "complete", transactionHash: "0xabc" });
    const smartAccount = {
      address: params.address ?? "0x0000000000000000000000000000000000000002",
      transfer: transferMock,
      sendUserOperation: sendUserOperationMock,
      waitForUserOperation: waitForUserOperationMock,
    };
    getOrCreateCliAgentSmartAccountMock.mockResolvedValue(smartAccount);
    return {
      transferMock,
      sendUserOperationMock,
      waitForUserOperationMock,
      smartAccount,
    };
  }

  beforeEach(() => {
    txLogFindUniqueMock.mockResolvedValue(null);
    txLogCreateMock.mockResolvedValue({ id: 1n });
    txLogUpdateMock.mockResolvedValue({ id: 1n });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("executes transfer", async () => {
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xtransfer-op" });
    const waitForUserOperationMock = vi
      .fn()
      .mockResolvedValue({ status: "complete", transactionHash: "0xtx" });
    setSmartAccountMocks({ sendUserOperationMock, waitForUserOperationMock });

    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "transfer",
        token: "usdc",
        amount: "0.25",
        to: "0x000000000000000000000000000000000000dEaD",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(requireCliBearerAuthMock).toHaveBeenCalledWith(request, {
      requiredScopes: ["wallet:execute"],
    });
    expect(response.headers.get("cache-control")).toBe("no-store");

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.kind).toBe("transfer");
    expect(body.transactionHash).toBe("0xtx");
    expect(sendUserOperationMock).toHaveBeenCalledTimes(1);
    expect(txLogCreateMock).toHaveBeenCalled();
  });

  it("returns success when transfer log persistence fails", async () => {
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xtransfer-op" });
    const waitForUserOperationMock = vi
      .fn()
      .mockResolvedValue({ status: "complete", transactionHash: "0xtx" });
    setSmartAccountMocks({ sendUserOperationMock, waitForUserOperationMock });

    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });
    txLogCreateMock.mockRejectedValue(new Error("db unavailable"));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const request = new Request("http://localhost/api/cli/exec", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "transfer",
          token: "eth",
          amount: "0.01",
          to: "0x000000000000000000000000000000000000dEaD",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect((await response.json()).ok).toBe(true);
      expect(sendUserOperationMock).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("returns 403 on policy errors", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });

    assertCliTransferAllowedMock.mockImplementation(() => {
      throw new CliPolicyError("blocked");
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "transfer",
        token: "eth",
        amount: "0.25",
        to: "0x000000000000000000000000000000000000dEaD",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "blocked" });
  });

  it("returns 503 on backend configuration errors", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockRejectedValue(
      new CliConfigError(
        "CLI wallet backend is not configured. Missing CDP credentials on the interface server."
      )
    );

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "transfer",
        token: "eth",
        amount: "0.25",
        to: "0x000000000000000000000000000000000000dEaD",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      error:
        "CLI wallet backend is not configured. Missing CDP credentials on the interface server.",
    });
  });

  it("executes tx", async () => {
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xtx-user-op" });
    const waitForUserOperationMock = vi
      .fn()
      .mockResolvedValue({ status: "complete", transactionHash: "0xabc" });
    setSmartAccountMocks({ sendUserOperationMock, waitForUserOperationMock });

    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
        valueEth: "0",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.kind).toBe("tx");
    expect(body.transactionHash).toBe("0xabc");
    expect(sendUserOperationMock).toHaveBeenCalled();
    expect(txLogCreateMock).toHaveBeenCalled();
  });

  it("keeps empty tx calldata and forwards builder suffix at user-op level", async () => {
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xtx-empty-user-op" });
    const waitForUserOperationMock = vi
      .fn()
      .mockResolvedValue({ status: "complete", transactionHash: "0xempty" });
    setSmartAccountMocks({ sendUserOperationMock, waitForUserOperationMock });

    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x",
        valueEth: "0",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(sendUserOperationMock).toHaveBeenCalledWith({
      network: "base-sepolia",
      calls: [
        {
          to: "0x000000000000000000000000000000000000dead",
          value: 0n,
          data: "0x",
        },
      ],
      dataSuffix: BASE_BUILDER_SUFFIX,
      idempotencyKey: undefined,
    });
  });

  it("returns success when tx log persistence fails", async () => {
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xtx-user-op" });
    const waitForUserOperationMock = vi
      .fn()
      .mockResolvedValue({ status: "complete", transactionHash: "0xabc" });
    setSmartAccountMocks({ sendUserOperationMock, waitForUserOperationMock });

    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });
    txLogCreateMock.mockRejectedValue(new Error("db unavailable"));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const request = new Request("http://localhost/api/cli/exec", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "tx",
          to: "0x000000000000000000000000000000000000dEaD",
          data: "0x12345678",
          valueEth: "0",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect((await response.json()).ok).toBe(true);
      expect(sendUserOperationMock).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("returns 401 on auth errors", async () => {
    requireCliBearerAuthMock.mockRejectedValue(new CliAuthError(401, "Unauthorized"));

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "transfer",
        token: "eth",
        amount: "0.01",
        to: "0x000000000000000000000000000000000000dEaD",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("returns 400 when request body is invalid json", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "Invalid JSON body" });
  });

  it("rejects unsupported transfer networks before execution", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "transfer",
        network: "unsupported-network",
        token: "eth",
        amount: "0.1",
        to: "0x000000000000000000000000000000000000dEaD",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Unsupported transfer network: unsupported-network",
    });
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
  });

  it("rejects unsupported tx networks before execution", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "tx",
        network: "zora",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Unsupported transaction network: zora",
    });
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
  });

  it("rejects transfer when amount is non-positive", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "transfer",
        token: "eth",
        amount: "-0.01",
        to: "0x000000000000000000000000000000000000dEaD",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "amount must be greater than 0",
    });
    expect(assertCliTransferAllowedMock).not.toHaveBeenCalled();
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
    expect(txLogCreateMock).not.toHaveBeenCalled();
  });

  it("rejects ERC-20 transfer without decimals", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "transfer",
        token: "0x000000000000000000000000000000000000bEEF",
        amount: "1",
        to: "0x000000000000000000000000000000000000dEaD",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "decimals is required when token is an ERC-20 contract address",
    });
    expect(assertCliTransferAllowedMock).not.toHaveBeenCalled();
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
    expect(txLogCreateMock).not.toHaveBeenCalled();
  });

  it("executes ERC-20 transfer with normalized addresses and atomic amount", async () => {
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xtransfer-op" });
    setSmartAccountMocks({ sendUserOperationMock });
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "transfer",
        token: "0x000000000000000000000000000000000000bEEF",
        amount: "1.5",
        decimals: 18,
        to: "0x000000000000000000000000000000000000dEaD",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(assertCliTransferAllowedMock).toHaveBeenCalledWith({
      network: "base-sepolia",
      to: "0x000000000000000000000000000000000000dead",
      token: "0x000000000000000000000000000000000000beef",
      amountAtomic: parseUnits("1.5", 18),
    });
    expect(sendUserOperationMock).toHaveBeenCalledWith({
      network: "base-sepolia",
      calls: [
        expect.objectContaining({
          to: "0x000000000000000000000000000000000000beef",
          value: 0n,
        }),
      ],
      dataSuffix: BASE_BUILDER_SUFFIX,
      idempotencyKey: undefined,
    });
    const transferCall = (
      sendUserOperationMock.mock.calls[0]?.[0] as { calls?: Array<{ data?: string }> }
    )?.calls?.[0];
    expect(transferCall?.data?.endsWith(BASE_BUILDER_SUFFIX.slice(2))).toBe(false);
  });

  it("returns 403 on tx policy errors", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });
    assertCliTxAllowedMock.mockImplementation(() => {
      throw new CliPolicyError("blocked tx");
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "blocked tx" });
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
  });

  it("does not reserve idempotency when tx policy rejects", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });
    assertCliTxAllowedMock.mockImplementation(() => {
      throw new CliPolicyError("blocked tx");
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "8e03978e-40d5-43e8-bc93-6894a57f9324",
      },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "blocked tx" });
    expect(txLogCreateMock).not.toHaveBeenCalled();
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
  });

  it("rejects tx when valueEth is negative", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
        valueEth: "-0.5",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "valueEth must be greater than or equal to 0",
    });
    expect(assertCliTxAllowedMock).not.toHaveBeenCalled();
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
    expect(txLogCreateMock).not.toHaveBeenCalled();
  });

  it("replays transfer response for an existing idempotency key", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });
    txLogFindUniqueMock.mockResolvedValue({
      kind: "transfer",
      network: "base-sepolia",
      to: "0x000000000000000000000000000000000000dead",
      token: "usdc",
      amount: "0.25",
      decimals: null,
      valueEth: null,
      data: null,
      txHash: "0xexisting",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "1d2c3b4a-5e6f-4a12-8b34-1234567890ab",
      },
      body: JSON.stringify({
        kind: "transfer",
        token: "usdc",
        amount: "0.25",
        to: "0x000000000000000000000000000000000000dEaD",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      kind: "transfer",
      replayed: true,
      wallet: {
        address: "0x0000000000000000000000000000000000000002",
      },
      transactionHash: "0xexisting",
      explorerUrl: "https://sepolia.basescan.org/tx/0xexisting",
    });
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
    expect(txLogCreateMock).not.toHaveBeenCalled();
  });

  it("replays tx response when request calldata already includes the builder suffix", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });
    txLogFindUniqueMock.mockResolvedValue({
      kind: "tx",
      network: "base-sepolia",
      to: "0x000000000000000000000000000000000000dead",
      token: null,
      amount: null,
      decimals: null,
      valueEth: "0",
      data: "0x12345678",
      txHash: "0xexisting",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "11b4cb35-2f3c-4d76-8cc0-e48f9642de5f",
      },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: `0x${TX_DATA_WITH_BUILDER_SUFFIX.slice(2).toUpperCase()}`,
        valueEth: "0",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      kind: "tx",
      replayed: true,
      wallet: {
        address: "0x0000000000000000000000000000000000000002",
      },
      transactionHash: "0xexisting",
      explorerUrl: "https://sepolia.basescan.org/tx/0xexisting",
    });
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
    expect(txLogCreateMock).not.toHaveBeenCalled();
  });

  it("rejects transfer idempotency-key reuse with a different payload", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });
    txLogFindUniqueMock.mockResolvedValue({
      kind: "transfer",
      network: "base-sepolia",
      to: "0x000000000000000000000000000000000000dead",
      token: "usdc",
      amount: "0.20",
      decimals: null,
      valueEth: null,
      data: null,
      txHash: "0xexisting",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "1d2c3b4a-5e6f-4a12-8b34-1234567890ab",
      },
      body: JSON.stringify({
        kind: "transfer",
        token: "usdc",
        amount: "0.25",
        to: "0x000000000000000000000000000000000000dEaD",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Idempotency key is already associated with a different transfer request",
    });
  });

  it("forwards idempotency key to sendUserOperation for tx requests", async () => {
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xtx-user-op" });
    setSmartAccountMocks({ sendUserOperationMock });
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
        valueEth: "0",
        idempotencyKey: "2a4f7c3e-9b10-4d2a-a7f2-112233445566",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(sendUserOperationMock).toHaveBeenCalledWith({
      network: "base-sepolia",
      calls: [
        {
          to: "0x000000000000000000000000000000000000dead",
          value: 0n,
          data: "0x12345678",
        },
      ],
      dataSuffix: BASE_BUILDER_SUFFIX,
      idempotencyKey: "2a4f7c3e-9b10-4d2a-a7f2-112233445566",
    });
    expect(txLogCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idempotencyKey: "2a4f7c3e-9b10-4d2a-a7f2-112233445566",
        }),
      })
    );
  });

  it("accepts X-Idempotency-Key header for tx requests", async () => {
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xtx-user-op" });
    setSmartAccountMocks({ sendUserOperationMock });
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });

    const idempotencyKey = "aa2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dead",
        data: "0x12345678",
        valueEth: "0",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(sendUserOperationMock).toHaveBeenCalledWith({
      network: "base-sepolia",
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
    expect(txLogCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idempotencyKey,
        }),
      })
    );
  });

  it("replays transfer when idempotency reservation races on unique key", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });
    txLogFindUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
      kind: "transfer",
      network: "base-sepolia",
      to: "0x000000000000000000000000000000000000dead",
      token: "usdc",
      amount: "0.25",
      decimals: null,
      valueEth: null,
      data: null,
      txHash: "0xexisting",
    });
    txLogCreateMock.mockRejectedValueOnce({ code: "P2002" });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "3c2b1a0f-8e7d-4c6b-9a12-abcdefabcdef",
      },
      body: JSON.stringify({
        kind: "transfer",
        token: "usdc",
        amount: "0.25",
        to: "0x000000000000000000000000000000000000dEaD",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      kind: "transfer",
      replayed: true,
      wallet: {
        address: "0x0000000000000000000000000000000000000002",
      },
      transactionHash: "0xexisting",
      explorerUrl: "https://sepolia.basescan.org/tx/0xexisting",
    });
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
    expect(txLogUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 500 when idempotency finalization fails after tx execution", async () => {
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xtx-user-op" });
    setSmartAccountMocks({ sendUserOperationMock });
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });
    txLogUpdateMock.mockRejectedValue(new Error("db unavailable"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const request = new Request("http://localhost/api/cli/exec", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "4d5e6f70-1234-4abc-b123-001122334455",
        },
        body: JSON.stringify({
          kind: "tx",
          to: "0x000000000000000000000000000000000000dEaD",
          data: "0x12345678",
          valueEth: "0",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ ok: false, error: "Internal error" });
      expect(sendUserOperationMock).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("rejects request-body agentKey when it does not match auth scope", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "agent-auth",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        kind: "tx",
        agentKey: "attempted-override",
        idempotencyKey: "5a6b7c8d-9e0f-4a1b-8c2d-556677889900",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
        valueEth: "0.3",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "agentKey does not match token scope",
    });
    expect(getOrCreateCliAgentWalletMock).not.toHaveBeenCalled();
    expect(txLogFindUniqueMock).not.toHaveBeenCalled();
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
    expect(txLogCreateMock).not.toHaveBeenCalled();
  });

  it("rejects tx idempotency-key reuse with a different valueEth", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });
    txLogFindUniqueMock.mockResolvedValue({
      kind: "tx",
      network: "base-sepolia",
      to: "0x000000000000000000000000000000000000dead",
      token: null,
      amount: null,
      decimals: null,
      valueEth: "0.1",
      data: "0x12345678",
      txHash: "0xexisting",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "1d2c3b4a-5e6f-4a12-8b34-1234567890ab",
      },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
        valueEth: "0.2",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Idempotency key is already associated with a different transaction request",
    });
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
    expect(txLogCreateMock).not.toHaveBeenCalled();
  });

  it("rejects mismatched idempotency header and body keys", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "6b7c8d9e-0f1a-4b2c-9d3e-667788990011",
      },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
        valueEth: "0",
        idempotencyKey: "7c8d9e0f-1a2b-4c3d-a4e5-778899001122",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Idempotency-Key header and body idempotencyKey must match when both are provided",
    });
  });

  it("rejects invalid idempotency-key headers before wallet lookup", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "bad key!",
      },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
        valueEth: "0",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      error: "Idempotency-Key header must be a UUID v4",
    });
    expect(getOrCreateCliAgentWalletMock).not.toHaveBeenCalled();
    expect(txLogFindUniqueMock).not.toHaveBeenCalled();
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
  });

  it("rejects replay when tx idempotency record is missing valueEth", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });
    txLogFindUniqueMock.mockResolvedValue({
      kind: "tx",
      network: "base-sepolia",
      to: "0x000000000000000000000000000000000000dead",
      token: null,
      amount: null,
      decimals: null,
      valueEth: null,
      data: "0x12345678",
      txHash: "0xexisting",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "8d9e0f1a-2b3c-4d4e-8f56-889900112233",
      },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
        valueEth: "0.1",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      error: "Stored idempotency record is missing valueEth",
    });
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
    expect(txLogCreateMock).not.toHaveBeenCalled();
  });

  it("rejects replay when tx idempotency record is not finalized", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });
    txLogFindUniqueMock.mockResolvedValue({
      kind: "tx",
      network: "base-sepolia",
      to: "0x000000000000000000000000000000000000dead",
      token: null,
      amount: null,
      decimals: null,
      valueEth: "0.1",
      data: "0x12345678",
      txHash: null,
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "9e0f1a2b-3c4d-4e5f-b678-990011223344",
      },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
        valueEth: "0.1",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      error: "Idempotency key is already associated with a pending or failed request",
    });
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
    expect(txLogCreateMock).not.toHaveBeenCalled();
  });

  it("returns 500 with no-store on unexpected errors", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockRejectedValue(new Error("wallet lookup crashed"));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const request = new Request("http://localhost/api/cli/exec", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "transfer",
          token: "eth",
          amount: "0.01",
          to: "0x000000000000000000000000000000000000dEaD",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ ok: false, error: "Internal error" });
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
