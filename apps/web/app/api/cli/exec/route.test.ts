import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseUnits } from "viem";
import { buildGoalStakeDepositPlan, buildPremiumClaimPlan } from "@cobuild/wire";

vi.mock("server-only", () => ({}));

const {
  requireCliBearerAuthMock,
  getOrCreateCliAgentWalletMock,
  getOrCreateCliAgentSmartAccountMock,
  assertCliTransferAllowedMock,
  assertCliTxAllowedMock,
  assertCliProtocolPlanAllowedMock,
  assertCliProtocolStepAllowedMock,
  txLogFindUniqueMock,
  txLogCreateMock,
  txLogUpdateMock,
  txLogUpdateManyMock,
} = vi.hoisted(() => ({
  requireCliBearerAuthMock: vi.fn(),
  getOrCreateCliAgentWalletMock: vi.fn(),
  getOrCreateCliAgentSmartAccountMock: vi.fn(),
  assertCliTransferAllowedMock: vi.fn(),
  assertCliTxAllowedMock: vi.fn(),
  assertCliProtocolPlanAllowedMock: vi.fn(),
  assertCliProtocolStepAllowedMock: vi.fn(),
  txLogFindUniqueMock: vi.fn(),
  txLogCreateMock: vi.fn(),
  txLogUpdateMock: vi.fn(),
  txLogUpdateManyMock: vi.fn(),
}));

vi.mock("@/lib/server/cli/auth", () => ({
  requireCliBearerAuth: (...args: unknown[]) => requireCliBearerAuthMock(...args),
}));

vi.mock("@/lib/server/cli/wallet-store", () => ({
  resolveCliExecWalletContext: async (...args: unknown[]) => {
    const [params] = args as [{ requestedNetwork?: string }?];
    const wallet = await getOrCreateCliAgentWalletMock(...args);
    return {
      requestedNetwork:
        typeof params?.requestedNetwork === "string"
          ? params.requestedNetwork
          : typeof wallet?.defaultNetwork === "string"
            ? wallet.defaultNetwork
            : "base",
      walletAddress: typeof wallet?.address === "string" ? wallet.address : undefined,
      getExecutionContext: () => getOrCreateCliAgentSmartAccountMock(...args),
    };
  },
}));

vi.mock("@/lib/server/cli/policy", () => ({
  assertCliTransferAllowed: (...args: unknown[]) => assertCliTransferAllowedMock(...args),
  assertCliTxAllowed: (...args: unknown[]) => assertCliTxAllowedMock(...args),
  assertCliProtocolPlanAllowed: (...args: unknown[]) => assertCliProtocolPlanAllowedMock(...args),
  assertCliProtocolStepAllowed: (...args: unknown[]) => assertCliProtocolStepAllowedMock(...args),
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

import { CliAuthError, CliConfigError, CliPolicyError } from "@/lib/server/cli/errors";
import { buildProtocolPlanIdempotencyFingerprint } from "./idempotency";
import { POST } from "./route";

const BASE_BUILDER_SUFFIX = "0x0b62635f64647972736c69780080218021802180218021802180218021";
const TX_DATA_WITH_BUILDER_SUFFIX = `0x12345678${BASE_BUILDER_SUFFIX.slice(2)}`;

function createCliTxLogRecord(
  overrides: Partial<{
    kind: string;
    network: string;
    to: string;
    token: string | null;
    amount: string | null;
    decimals: number | null;
    valueEth: string | null;
    data: string | null;
    txHash: string | null;
    userOpHash: string | null;
    status: string;
    expiresAt: Date | null;
    updatedAt: Date;
  }> = {}
) {
  return {
    kind: "transfer",
    network: "base",
    to: "0x000000000000000000000000000000000000dead",
    token: "usdc",
    amount: "0.25",
    decimals: null,
    valueEth: null,
    data: null,
    txHash: "0xexisting",
    userOpHash: null,
    status: "confirmed",
    expiresAt: null,
    updatedAt: new Date("2026-03-10T00:00:00.000Z"),
    ...overrides,
  };
}

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
    getOrCreateCliAgentSmartAccountMock.mockResolvedValue({
      wallet: {
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
        cdpAccountName: "cli-smart",
        address: smartAccount.address,
        defaultNetwork: "base",
      },
      smartAccount,
      walletAddress: smartAccount.address,
    });
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
    txLogUpdateManyMock.mockResolvedValue({ count: 1 });
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
      defaultNetwork: "base",
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

  it("executes protocol-step requests with semantic validation instead of raw tx policy gates", async () => {
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xprotocol-op" });
    const waitForUserOperationMock = vi
      .fn()
      .mockResolvedValue({ status: "complete", transactionHash: "0xprotocol-tx" });
    setSmartAccountMocks({ sendUserOperationMock, waitForUserOperationMock });

    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base",
    });

    const plan = buildPremiumClaimPlan({
      premiumEscrowAddress: "0x00000000000000000000000000000000000000aa",
      recipient: "0x00000000000000000000000000000000000000bb",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "protocol-step",
        network: "base",
        action: plan.action,
        riskClass: plan.riskClass,
        step: plan.steps[0],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      kind: "protocol-step",
      transactionHash: "0xprotocol-tx",
    });

    expect(assertCliProtocolStepAllowedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "protocol-step",
        action: "premium.claim",
        riskClass: "claim",
      })
    );
    expect(assertCliTxAllowedMock).not.toHaveBeenCalled();
    expect(sendUserOperationMock).toHaveBeenCalledWith({
      network: "base",
      calls: [
        {
          to: plan.steps[0]!.transaction.to,
          value: 0n,
          data: plan.steps[0]!.transaction.data,
        },
      ],
      dataSuffix: BASE_BUILDER_SUFFIX,
      idempotencyKey: undefined,
    });
    expect(txLogCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "protocol-step:premium.claim",
        }),
      })
    );
  });

  it("executes protocol-plan requests as one hosted user operation", async () => {
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xprotocol-plan-op" });
    const waitForUserOperationMock = vi
      .fn()
      .mockResolvedValue({ status: "complete", transactionHash: "0xprotocol-plan-tx" });
    setSmartAccountMocks({ sendUserOperationMock, waitForUserOperationMock });

    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base",
    });

    const plan = buildGoalStakeDepositPlan({
      network: "base",
      stakeVaultAddress: "0x0000000000000000000000000000000000000022",
      goalTokenAddress: "0x0000000000000000000000000000000000000011",
      amount: "100",
      approvalMode: "force",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "protocol-plan",
        network: "base",
        action: plan.action,
        riskClass: plan.riskClass,
        steps: plan.steps,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      kind: "protocol-plan",
      transactionHash: "0xprotocol-plan-tx",
    });

    expect(assertCliProtocolPlanAllowedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "protocol-plan",
        action: "stake.deposit-goal",
        riskClass: "stake",
        steps: plan.steps,
      })
    );
    expect(assertCliTxAllowedMock).not.toHaveBeenCalled();
    expect(sendUserOperationMock).toHaveBeenCalledWith({
      network: "base",
      calls: plan.steps.map((step) => ({
        to: step.transaction.to,
        value: 0n,
        data: step.transaction.data,
      })),
      dataSuffix: BASE_BUILDER_SUFFIX,
      idempotencyKey: undefined,
    });
    expect(txLogCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "protocol-plan",
          to: plan.steps[1]!.transaction.to,
          data: expect.stringMatching(/^0x[0-9a-f]{64}$/),
        }),
      })
    );
  });

  it("prefers an explicit protocol-step network over an unsupported stored wallet default", async () => {
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xprotocol-op" });
    const waitForUserOperationMock = vi
      .fn()
      .mockResolvedValue({ status: "complete", transactionHash: "0xprotocol-tx" });
    setSmartAccountMocks({ sendUserOperationMock, waitForUserOperationMock });

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

    const plan = buildPremiumClaimPlan({
      premiumEscrowAddress: "0x00000000000000000000000000000000000000aa",
      recipient: "0x00000000000000000000000000000000000000bb",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "protocol-step",
        network: "base",
        action: plan.action,
        riskClass: plan.riskClass,
        step: plan.steps[0],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(getOrCreateCliAgentWalletMock).toHaveBeenCalledWith({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      requestedNetwork: "base",
    });
    expect(sendUserOperationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        network: "base",
      })
    );
    expect(txLogCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          network: "base",
        }),
      })
    );
  });

  it("prefers an explicit transfer network over an unsupported stored wallet default", async () => {
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
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "transfer",
        network: "base",
        token: "usdc",
        amount: "0.25",
        to: "0x000000000000000000000000000000000000dEaD",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(getOrCreateCliAgentWalletMock).toHaveBeenCalledWith({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      requestedNetwork: "base",
    });
    expect(sendUserOperationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        network: "base",
      })
    );
    expect(txLogCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          network: "base",
        }),
      })
    );
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
      defaultNetwork: "base",
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
      defaultNetwork: "base",
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
      defaultNetwork: "base",
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

  it("prefers an explicit tx network over an unsupported stored wallet default", async () => {
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
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "tx",
        network: "base",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
        valueEth: "0",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(getOrCreateCliAgentWalletMock).toHaveBeenCalledWith({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      requestedNetwork: "base",
    });
    expect(sendUserOperationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        network: "base",
      })
    );
    expect(txLogCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          network: "base",
        }),
      })
    );
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
      defaultNetwork: "base",
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
      network: "base",
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
      defaultNetwork: "base",
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

  it("returns 403 when bearer auth reports a missing required scope", async () => {
    requireCliBearerAuthMock.mockRejectedValue(
      new CliAuthError(403, "wallet:execute scope required")
    );

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
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      error: "wallet:execute scope required",
    });
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
      defaultNetwork: "base",
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

  it("rejects base-sepolia transfer requests after the Base-only cutover", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "transfer",
        network: "base-sepolia",
        token: "eth",
        amount: "0.1",
        to: "0x000000000000000000000000000000000000dEaD",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Unsupported transfer network: base-sepolia",
    });
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
  });

  it("rejects transfer when the stored wallet default network is unsupported and the request omits network", async () => {
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
        amount: "0.1",
        to: "0x000000000000000000000000000000000000dEaD",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Unsupported transfer network: base-sepolia",
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
      defaultNetwork: "base",
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

  it("rejects tx when the stored wallet default network is unsupported and the request omits network", async () => {
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
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Unsupported transaction network: base-sepolia",
    });
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
  });

  it("rejects protocol-step when the stored wallet default network is unsupported and the request omits network", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base-sepolia",
    });

    const plan = buildPremiumClaimPlan({
      premiumEscrowAddress: "0x00000000000000000000000000000000000000aa",
      recipient: "0x00000000000000000000000000000000000000bb",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "protocol-step",
        action: plan.action,
        riskClass: plan.riskClass,
        step: plan.steps[0],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "unsupported protocol network: base-sepolia",
    });
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
  });

  it("rejects base-sepolia tx requests after the Base-only cutover", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "tx",
        network: "base-sepolia",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Unsupported transaction network: base-sepolia",
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
      defaultNetwork: "base",
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
      defaultNetwork: "base",
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
      defaultNetwork: "base",
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
      network: "base",
      to: "0x000000000000000000000000000000000000dead",
      token: "0x000000000000000000000000000000000000beef",
      amountAtomic: parseUnits("1.5", 18),
    });
    expect(sendUserOperationMock).toHaveBeenCalledWith({
      network: "base",
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
      defaultNetwork: "base",
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
      defaultNetwork: "base",
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
      defaultNetwork: "base",
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
      defaultNetwork: "base",
    });
    txLogFindUniqueMock.mockResolvedValue(createCliTxLogRecord());

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
      status: "confirmed",
      replayed: true,
      wallet: {
        address: "0x0000000000000000000000000000000000000002",
      },
      transactionHash: "0xexisting",
      explorerUrl: "https://basescan.org/tx/0xexisting",
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
      defaultNetwork: "base",
    });
    txLogFindUniqueMock.mockResolvedValue(
      createCliTxLogRecord({
        kind: "tx",
        token: null,
        amount: null,
        valueEth: "0",
        data: "0x12345678",
      })
    );

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
      status: "confirmed",
      replayed: true,
      wallet: {
        address: "0x0000000000000000000000000000000000000002",
      },
      transactionHash: "0xexisting",
      explorerUrl: "https://basescan.org/tx/0xexisting",
    });
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
    expect(txLogCreateMock).not.toHaveBeenCalled();
  });

  it("replays a confirmed tx response before re-evaluating raw tx policy", async () => {
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
      defaultNetwork: "base",
    });
    txLogFindUniqueMock.mockResolvedValue(
      createCliTxLogRecord({
        kind: "tx",
        token: null,
        amount: null,
        valueEth: "0",
        data: "0x12345678",
      })
    );
    assertCliTxAllowedMock.mockImplementation(() => {
      throw new CliPolicyError("Contract is not allowlisted");
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "11b4cb35-2f3c-4d76-8cc0-e48f9642de5e",
      },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
        valueEth: "0",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      kind: "tx",
      status: "confirmed",
      replayed: true,
      wallet: {
        address: "0x0000000000000000000000000000000000000002",
      },
      transactionHash: "0xexisting",
      explorerUrl: "https://basescan.org/tx/0xexisting",
    });
    expect(assertCliTxAllowedMock).not.toHaveBeenCalled();
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
    expect(txLogCreateMock).not.toHaveBeenCalled();
  });

  it("resumes a submitted tx response before re-evaluating raw tx policy", async () => {
    const waitForUserOperationMock = vi.fn().mockResolvedValue({
      status: "complete",
      transactionHash: "0xsubmitted",
    });
    const sendUserOperationMock = vi.fn();
    setSmartAccountMocks({ sendUserOperationMock, waitForUserOperationMock });

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
      defaultNetwork: "base",
    });
    txLogFindUniqueMock.mockResolvedValue(
      createCliTxLogRecord({
        kind: "tx",
        token: null,
        amount: null,
        valueEth: "0",
        data: "0x12345678",
        txHash: null,
        userOpHash: "0xsubmitted-user-op",
        status: "submitted",
      })
    );
    assertCliTxAllowedMock.mockImplementation(() => {
      throw new CliPolicyError("Contract is not allowlisted");
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "22b4cb35-2f3c-4d76-8cc0-e48f9642de5e",
      },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
        valueEth: "0",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      kind: "tx",
      status: "confirmed",
      wallet: {
        address: "0x0000000000000000000000000000000000000002",
      },
      transactionHash: "0xsubmitted",
      userOpHash: "0xsubmitted-user-op",
      explorerUrl: "https://basescan.org/tx/0xsubmitted",
    });
    expect(assertCliTxAllowedMock).not.toHaveBeenCalled();
    expect(sendUserOperationMock).not.toHaveBeenCalled();
    expect(waitForUserOperationMock).toHaveBeenCalledWith({
      userOpHash: "0xsubmitted-user-op",
    });
    expect(txLogCreateMock).not.toHaveBeenCalled();
  });

  it("replays protocol-step response for an existing idempotency key", async () => {
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
      defaultNetwork: "base",
    });
    const plan = buildPremiumClaimPlan({
      premiumEscrowAddress: "0x00000000000000000000000000000000000000aa",
      recipient: "0x00000000000000000000000000000000000000bb",
    });
    txLogFindUniqueMock.mockResolvedValue(
      createCliTxLogRecord({
        kind: "protocol-step:premium.claim",
        to: plan.steps[0]!.transaction.to,
        token: null,
        amount: null,
        valueEth: "0",
        data: plan.steps[0]!.transaction.data,
      })
    );

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "44b4cb35-2f3c-4d76-8cc0-e48f9642de5f",
      },
      body: JSON.stringify({
        kind: "protocol-step",
        action: plan.action,
        riskClass: plan.riskClass,
        step: plan.steps[0],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      kind: "protocol-step",
      status: "confirmed",
      replayed: true,
      wallet: {
        address: "0x0000000000000000000000000000000000000002",
      },
      transactionHash: "0xexisting",
      explorerUrl: "https://basescan.org/tx/0xexisting",
    });
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
    expect(txLogCreateMock).not.toHaveBeenCalled();
  });

  it("replays protocol-plan response for an existing idempotency key", async () => {
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
      defaultNetwork: "base",
    });
    const plan = buildGoalStakeDepositPlan({
      network: "base",
      stakeVaultAddress: "0x0000000000000000000000000000000000000022",
      goalTokenAddress: "0x0000000000000000000000000000000000000011",
      amount: "100",
      approvalMode: "force",
    });
    const fingerprint = buildProtocolPlanIdempotencyFingerprint({
      logKind: "protocol-plan:stake.deposit-goal",
      network: "base",
      steps: plan.steps,
    });
    txLogFindUniqueMock.mockResolvedValue(
      createCliTxLogRecord({
        kind: "protocol-plan",
        to: plan.steps[1]!.transaction.to,
        token: null,
        amount: null,
        valueEth: plan.steps[1]!.transaction.valueEth,
        data: fingerprint,
      })
    );

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "66b4cb35-2f3c-4d76-8cc0-e48f9642de5f",
      },
      body: JSON.stringify({
        kind: "protocol-plan",
        action: plan.action,
        riskClass: plan.riskClass,
        steps: plan.steps,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      kind: "protocol-plan",
      status: "confirmed",
      replayed: true,
      wallet: {
        address: "0x0000000000000000000000000000000000000002",
      },
      transactionHash: "0xexisting",
      explorerUrl: "https://basescan.org/tx/0xexisting",
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
      defaultNetwork: "base",
    });
    txLogFindUniqueMock.mockResolvedValue({
      kind: "transfer",
      network: "base",
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

  it("rejects protocol-step idempotency-key reuse with a different payload", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base",
    });
    const storedPlan = buildPremiumClaimPlan({
      premiumEscrowAddress: "0x00000000000000000000000000000000000000aa",
      recipient: "0x00000000000000000000000000000000000000bb",
    });
    const requestPlan = buildPremiumClaimPlan({
      premiumEscrowAddress: "0x00000000000000000000000000000000000000aa",
      recipient: "0x00000000000000000000000000000000000000cc",
    });
    txLogFindUniqueMock.mockResolvedValue(
      createCliTxLogRecord({
        kind: "protocol-step:premium.claim",
        to: storedPlan.steps[0]!.transaction.to,
        token: null,
        amount: null,
        valueEth: "0",
        data: storedPlan.steps[0]!.transaction.data,
      })
    );

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "55c4cb35-2f3c-4d76-8cc0-e48f9642de5f",
      },
      body: JSON.stringify({
        kind: "protocol-step",
        action: requestPlan.action,
        riskClass: requestPlan.riskClass,
        step: requestPlan.steps[0],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Idempotency key is already associated with a different protocol-step request",
    });
  });

  it("rejects protocol-plan idempotency-key reuse with a different payload", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base",
    });
    const storedPlan = buildGoalStakeDepositPlan({
      network: "base",
      stakeVaultAddress: "0x0000000000000000000000000000000000000022",
      goalTokenAddress: "0x0000000000000000000000000000000000000011",
      amount: "100",
      approvalMode: "force",
    });
    const requestPlan = buildGoalStakeDepositPlan({
      network: "base",
      stakeVaultAddress: "0x0000000000000000000000000000000000000022",
      goalTokenAddress: "0x0000000000000000000000000000000000000011",
      amount: "101",
      approvalMode: "force",
    });
    txLogFindUniqueMock.mockResolvedValue(
      createCliTxLogRecord({
        kind: "protocol-plan",
        to: storedPlan.steps[1]!.transaction.to,
        token: null,
        amount: null,
        valueEth: storedPlan.steps[1]!.transaction.valueEth,
        data: buildProtocolPlanIdempotencyFingerprint({
          logKind: "protocol-plan:stake.deposit-goal",
          network: "base",
          steps: storedPlan.steps,
        }),
      })
    );

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "77c4cb35-2f3c-4d76-8cc0-e48f9642de5f",
      },
      body: JSON.stringify({
        kind: "protocol-plan",
        action: requestPlan.action,
        riskClass: requestPlan.riskClass,
        steps: requestPlan.steps,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Idempotency key is already associated with a different protocol-plan request",
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
      defaultNetwork: "base",
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
      network: "base",
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
      defaultNetwork: "base",
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
      defaultNetwork: "base",
    });
    txLogFindUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce(createCliTxLogRecord());
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
      status: "confirmed",
      replayed: true,
      wallet: {
        address: "0x0000000000000000000000000000000000000002",
      },
      transactionHash: "0xexisting",
      explorerUrl: "https://basescan.org/tx/0xexisting",
    });
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
    expect(txLogUpdateMock).not.toHaveBeenCalled();
  });

  it("resumes without re-submitting when submission persistence fails after tx execution", async () => {
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xtx-user-op" });
    setSmartAccountMocks({ sendUserOperationMock });
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base",
    });
    txLogFindUniqueMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        createCliTxLogRecord({
          kind: "tx",
          token: null,
          amount: null,
          valueEth: "0",
          data: "0x12345678",
          txHash: null,
          userOpHash: "0xtx-user-op",
          status: "failed",
        })
      )
      .mockResolvedValueOnce(
        createCliTxLogRecord({
          kind: "tx",
          token: null,
          amount: null,
          valueEth: "0",
          data: "0x12345678",
          txHash: null,
          userOpHash: "0xtx-user-op",
          status: "failed",
        })
      )
      .mockResolvedValueOnce(
        createCliTxLogRecord({
          kind: "tx",
          token: null,
          amount: null,
          valueEth: "0",
          data: "0x12345678",
          txHash: null,
          userOpHash: "0xtx-user-op",
          status: "failed",
        })
      );
    txLogUpdateMock
      .mockRejectedValueOnce(new Error("db unavailable"))
      .mockResolvedValueOnce({ id: 1n })
      .mockResolvedValueOnce({ id: 1n });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const buildRequest = () =>
      new Request("http://localhost/api/cli/exec", {
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

    try {
      const failedResponse = await POST(buildRequest());
      expect(failedResponse.status).toBe(500);
      expect(failedResponse.headers.get("cache-control")).toBe("no-store");
      expect(await failedResponse.json()).toEqual({ ok: false, error: "Internal error" });
      expect(txLogUpdateMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: {
            status: "failed",
            userOpHash: "0xtx-user-op",
            expiresAt: null,
          },
        })
      );
      expect(sendUserOperationMock).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalled();

      const resumedResponse = await POST(buildRequest());
      expect(resumedResponse.status).toBe(200);
      expect(await resumedResponse.json()).toEqual({
        ok: true,
        kind: "tx",
        status: "confirmed",
        wallet: {
          address: "0x0000000000000000000000000000000000000002",
        },
        transactionHash: "0xabc",
        userOpHash: "0xtx-user-op",
        explorerUrl: "https://basescan.org/tx/0xabc",
      });
      expect(sendUserOperationMock).toHaveBeenCalledTimes(1);
      expect(txLogUpdateMock).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          data: {
            status: "confirmed",
            txHash: "0xabc",
            userOpHash: "0xtx-user-op",
            expiresAt: null,
          },
        })
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("returns 500 when idempotency finalization fails after confirmation", async () => {
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xtx-user-op" });
    setSmartAccountMocks({ sendUserOperationMock });
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      cdpAccountName: "cli-123",
      defaultNetwork: "base",
    });
    txLogUpdateMock
      .mockResolvedValueOnce({ id: 1n })
      .mockRejectedValueOnce(new Error("db unavailable"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const request = new Request("http://localhost/api/cli/exec", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "5d5e6f70-1234-4abc-b123-001122334455",
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
            status: "confirmed",
            txHash: "0xabc",
            userOpHash: "0xtx-user-op",
            expiresAt: null,
          },
        })
      );
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
      defaultNetwork: "base",
    });
    txLogFindUniqueMock.mockResolvedValue({
      kind: "tx",
      network: "base",
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
      defaultNetwork: "base",
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
      defaultNetwork: "base",
    });
    txLogFindUniqueMock.mockResolvedValue(
      createCliTxLogRecord({
        kind: "tx",
        token: null,
        amount: null,
        valueEth: null,
        data: "0x12345678",
      })
    );

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

  it("rejects replay while a tx idempotency reservation is still in progress", async () => {
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
      defaultNetwork: "base",
    });
    txLogFindUniqueMock.mockResolvedValue(
      createCliTxLogRecord({
        kind: "tx",
        token: null,
        amount: null,
        valueEth: "0.1",
        data: "0x12345678",
        txHash: null,
        status: "pending",
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      })
    );

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
      error: "Idempotency key reservation is still in progress; retry shortly",
    });
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
    expect(txLogCreateMock).not.toHaveBeenCalled();
  });

  it("returns 202 pending when confirmation exceeds the hosted wait timeout", async () => {
    vi.useFakeTimers();
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xpending-user-op" });
    const waitForUserOperationMock = vi.fn().mockImplementation(() => new Promise<never>(() => {}));
    setSmartAccountMocks({ sendUserOperationMock, waitForUserOperationMock });

    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "11111111-2222-4333-8444-555555555555",
      },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
        valueEth: "0",
      }),
    });

    try {
      const responsePromise = POST(request);
      await vi.advanceTimersByTimeAsync(20_000);
      const response = await responsePromise;

      expect(response.status).toBe(202);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({
        ok: true,
        kind: "tx",
        status: "pending",
        pending: true,
        wallet: {
          address: "0x0000000000000000000000000000000000000002",
        },
        transactionHash: null,
        userOpHash: "0xpending-user-op",
        explorerUrl: null,
      });
      expect(txLogUpdateMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: {
            status: "submitted",
            userOpHash: "0xpending-user-op",
            expiresAt: null,
          },
        })
      );
      expect(txLogUpdateMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: {
            status: "timed_out",
            userOpHash: "0xpending-user-op",
            expiresAt: null,
          },
        })
      );
      expect(txLogUpdateMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns 202 pending for transfers when confirmation exceeds the hosted wait timeout", async () => {
    vi.useFakeTimers();
    const sendUserOperationMock = vi
      .fn()
      .mockResolvedValue({ userOpHash: "0xpending-transfer-op" });
    const waitForUserOperationMock = vi.fn().mockImplementation(() => new Promise<never>(() => {}));
    setSmartAccountMocks({ sendUserOperationMock, waitForUserOperationMock });

    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "22222222-3333-4444-8555-666666666666",
      },
      body: JSON.stringify({
        kind: "transfer",
        token: "usdc",
        amount: "0.25",
        to: "0x000000000000000000000000000000000000dEaD",
      }),
    });

    try {
      const responsePromise = POST(request);
      await vi.advanceTimersByTimeAsync(20_000);
      const response = await responsePromise;

      expect(response.status).toBe(202);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({
        ok: true,
        kind: "transfer",
        status: "pending",
        pending: true,
        wallet: {
          address: "0x0000000000000000000000000000000000000002",
        },
        transactionHash: null,
        userOpHash: "0xpending-transfer-op",
        explorerUrl: null,
      });
      expect(txLogUpdateMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: {
            status: "submitted",
            userOpHash: "0xpending-transfer-op",
            expiresAt: null,
          },
        })
      );
      expect(txLogUpdateMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: {
            status: "timed_out",
            userOpHash: "0xpending-transfer-op",
            expiresAt: null,
          },
        })
      );
      expect(txLogUpdateMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns 202 pending for protocol-step requests when confirmation exceeds the hosted wait timeout", async () => {
    vi.useFakeTimers();
    const sendUserOperationMock = vi
      .fn()
      .mockResolvedValue({ userOpHash: "0xpending-protocol-op" });
    const waitForUserOperationMock = vi.fn().mockImplementation(() => new Promise<never>(() => {}));
    setSmartAccountMocks({ sendUserOperationMock, waitForUserOperationMock });

    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base",
    });
    const plan = buildPremiumClaimPlan({
      premiumEscrowAddress: "0x00000000000000000000000000000000000000aa",
      recipient: "0x00000000000000000000000000000000000000bb",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "44444444-3333-4444-8555-666666666666",
      },
      body: JSON.stringify({
        kind: "protocol-step",
        action: plan.action,
        riskClass: plan.riskClass,
        step: plan.steps[0],
      }),
    });

    try {
      const responsePromise = POST(request);
      await vi.advanceTimersByTimeAsync(20_000);
      const response = await responsePromise;

      expect(response.status).toBe(202);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({
        ok: true,
        kind: "protocol-step",
        status: "pending",
        pending: true,
        wallet: {
          address: "0x0000000000000000000000000000000000000002",
        },
        transactionHash: null,
        userOpHash: "0xpending-protocol-op",
        explorerUrl: null,
      });
      expect(txLogUpdateMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: {
            status: "submitted",
            userOpHash: "0xpending-protocol-op",
            expiresAt: null,
          },
        })
      );
      expect(txLogUpdateMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: {
            status: "timed_out",
            userOpHash: "0xpending-protocol-op",
            expiresAt: null,
          },
        })
      );
      expect(txLogUpdateMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns 202 pending for protocol-plan requests when confirmation exceeds the hosted wait timeout", async () => {
    vi.useFakeTimers();
    const sendUserOperationMock = vi.fn().mockResolvedValue({ userOpHash: "0xpending-plan-op" });
    const waitForUserOperationMock = vi.fn().mockImplementation(() => new Promise<never>(() => {}));
    setSmartAccountMocks({ sendUserOperationMock, waitForUserOperationMock });

    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base",
    });
    const plan = buildGoalStakeDepositPlan({
      network: "base",
      stakeVaultAddress: "0x0000000000000000000000000000000000000022",
      goalTokenAddress: "0x0000000000000000000000000000000000000011",
      amount: "100",
      approvalMode: "force",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "55555555-3333-4444-8555-666666666666",
      },
      body: JSON.stringify({
        kind: "protocol-plan",
        action: plan.action,
        riskClass: plan.riskClass,
        steps: plan.steps,
      }),
    });

    try {
      const responsePromise = POST(request);
      await vi.advanceTimersByTimeAsync(20_000);
      const response = await responsePromise;

      expect(response.status).toBe(202);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({
        ok: true,
        kind: "protocol-plan",
        status: "pending",
        pending: true,
        wallet: {
          address: "0x0000000000000000000000000000000000000002",
        },
        transactionHash: null,
        userOpHash: "0xpending-plan-op",
        explorerUrl: null,
      });
      expect(txLogUpdateMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: {
            status: "submitted",
            userOpHash: "0xpending-plan-op",
            expiresAt: null,
          },
        })
      );
      expect(txLogUpdateMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: {
            status: "timed_out",
            userOpHash: "0xpending-plan-op",
            expiresAt: null,
          },
        })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("resumes a submitted tx idempotency record without re-submitting the user operation", async () => {
    const waitForUserOperationMock = vi.fn().mockResolvedValue({
      status: "complete",
      transactionHash: "0xsubmitted",
    });
    const sendUserOperationMock = vi.fn();
    setSmartAccountMocks({ sendUserOperationMock, waitForUserOperationMock });

    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base",
    });
    txLogFindUniqueMock.mockResolvedValue(
      createCliTxLogRecord({
        kind: "tx",
        token: null,
        amount: null,
        valueEth: "0",
        data: "0x12345678",
        txHash: null,
        userOpHash: "0xsubmitted-user-op",
        status: "submitted",
      })
    );

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "2f7f8d9c-4444-4555-8666-888888888888",
      },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
        valueEth: "0",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      kind: "tx",
      status: "confirmed",
      wallet: {
        address: "0x0000000000000000000000000000000000000002",
      },
      transactionHash: "0xsubmitted",
      userOpHash: "0xsubmitted-user-op",
      explorerUrl: "https://basescan.org/tx/0xsubmitted",
    });
    expect(sendUserOperationMock).not.toHaveBeenCalled();
    expect(waitForUserOperationMock).toHaveBeenCalledWith({
      userOpHash: "0xsubmitted-user-op",
    });
    expect(txLogUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: "confirmed",
          txHash: "0xsubmitted",
          userOpHash: "0xsubmitted-user-op",
          expiresAt: null,
        },
      })
    );
    expect(txLogCreateMock).not.toHaveBeenCalled();
  });

  it("resumes a timed-out tx idempotency record without re-submitting the user operation", async () => {
    const waitForUserOperationMock = vi.fn().mockResolvedValue({
      status: "complete",
      transactionHash: "0xresumed",
    });
    const sendUserOperationMock = vi.fn();
    setSmartAccountMocks({ sendUserOperationMock, waitForUserOperationMock });

    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base",
    });
    txLogFindUniqueMock.mockResolvedValue(
      createCliTxLogRecord({
        kind: "tx",
        token: null,
        amount: null,
        valueEth: "0",
        data: "0x12345678",
        txHash: null,
        userOpHash: "0xtimed-out-user-op",
        status: "timed_out",
      })
    );

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "33333333-4444-4555-8666-777777777777",
      },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: "0x12345678",
        valueEth: "0",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      kind: "tx",
      status: "confirmed",
      wallet: {
        address: "0x0000000000000000000000000000000000000002",
      },
      transactionHash: "0xresumed",
      userOpHash: "0xtimed-out-user-op",
      explorerUrl: "https://basescan.org/tx/0xresumed",
    });
    expect(sendUserOperationMock).not.toHaveBeenCalled();
    expect(waitForUserOperationMock).toHaveBeenCalledWith({
      userOpHash: "0xtimed-out-user-op",
    });
    expect(txLogUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: "confirmed",
          txHash: "0xresumed",
          userOpHash: "0xtimed-out-user-op",
          expiresAt: null,
        },
      })
    );
    expect(txLogCreateMock).not.toHaveBeenCalled();
  });

  it("resumes a timed-out protocol-plan idempotency record without re-submitting the user operation", async () => {
    const waitForUserOperationMock = vi.fn().mockResolvedValue({
      status: "complete",
      transactionHash: "0xresumed-plan",
    });
    const sendUserOperationMock = vi.fn();
    setSmartAccountMocks({ sendUserOperationMock, waitForUserOperationMock });

    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      address: "0x0000000000000000000000000000000000000002",
      cdpAccountName: "cli-123",
      defaultNetwork: "base",
    });

    const plan = buildGoalStakeDepositPlan({
      network: "base",
      stakeVaultAddress: "0x0000000000000000000000000000000000000022",
      goalTokenAddress: "0x0000000000000000000000000000000000000011",
      amount: "100",
      approvalMode: "force",
    });
    const fingerprint = buildProtocolPlanIdempotencyFingerprint({
      logKind: "protocol-plan:stake.deposit-goal",
      network: "base",
      steps: plan.steps,
    });
    const lastStep = plan.steps[plan.steps.length - 1]!;

    txLogFindUniqueMock.mockResolvedValue(
      createCliTxLogRecord({
        kind: "protocol-plan",
        to: lastStep.transaction.to,
        token: null,
        amount: null,
        valueEth: lastStep.transaction.valueEth,
        data: fingerprint,
        txHash: null,
        userOpHash: "0xtimed-out-plan-user-op",
        status: "timed_out",
      })
    );

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "77777777-4444-4555-8666-999999999999",
      },
      body: JSON.stringify({
        kind: "protocol-plan",
        action: plan.action,
        riskClass: plan.riskClass,
        steps: plan.steps,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      kind: "protocol-plan",
      status: "confirmed",
      wallet: {
        address: "0x0000000000000000000000000000000000000002",
      },
      transactionHash: "0xresumed-plan",
      userOpHash: "0xtimed-out-plan-user-op",
      explorerUrl: "https://basescan.org/tx/0xresumed-plan",
    });
    expect(sendUserOperationMock).not.toHaveBeenCalled();
    expect(waitForUserOperationMock).toHaveBeenCalledWith({
      userOpHash: "0xtimed-out-plan-user-op",
    });
    expect(txLogUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: "confirmed",
          txHash: "0xresumed-plan",
          userOpHash: "0xtimed-out-plan-user-op",
          expiresAt: null,
        },
      })
    );
    expect(txLogCreateMock).not.toHaveBeenCalled();
  });

  it("rejects oversized request bodies before execution", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    const request = new Request("http://localhost/api/cli/exec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "tx",
        to: "0x000000000000000000000000000000000000dEaD",
        data: `0x${"12".repeat(40_000)}`,
        valueEth: "0",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Request body exceeds 65536 bytes",
    });
    expect(getOrCreateCliAgentWalletMock).not.toHaveBeenCalled();
    expect(getOrCreateCliAgentSmartAccountMock).not.toHaveBeenCalled();
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
