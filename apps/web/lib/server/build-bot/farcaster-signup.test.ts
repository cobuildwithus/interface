import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getClientMock, getOrCreateBuildBotAgentSmartAccountMock } = vi.hoisted(() => ({
  getClientMock: vi.fn(),
  getOrCreateBuildBotAgentSmartAccountMock: vi.fn(),
}));

vi.mock("@/lib/domains/token/onchain/clients", () => ({
  getClient: (...args: unknown[]) => getClientMock(...args),
}));

vi.mock("@/lib/server/build-bot/wallet-store", () => ({
  getOrCreateBuildBotAgentSmartAccount: (...args: unknown[]) =>
    getOrCreateBuildBotAgentSmartAccountMock(...args),
}));

import {
  BuildBotFarcasterAlreadyRegisteredError,
  BuildBotFarcasterUserOperationError,
  signupBuildBotFarcaster,
} from "./farcaster-signup";

describe("build-bot farcaster signup service", () => {
  const readContractMock = vi.fn();
  const getBalanceMock = vi.fn();
  const sendUserOperationMock = vi.fn();
  const waitForUserOperationMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    getClientMock.mockReturnValue({
      readContract: (...args: unknown[]) => readContractMock(...args),
      getBalance: (...args: unknown[]) => getBalanceMock(...args),
    });

    getOrCreateBuildBotAgentSmartAccountMock.mockResolvedValue({
      address: "0x00000000000000000000000000000000000000aa",
      sendUserOperation: (...args: unknown[]) => sendUserOperationMock(...args),
      waitForUserOperation: (...args: unknown[]) => waitForUserOperationMock(...args),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("throws when Farcaster account already exists for custody wallet", async () => {
    readContractMock.mockResolvedValueOnce(123n);

    await expect(
      signupBuildBotFarcaster({
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
        signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
      })
    ).rejects.toBeInstanceOf(BuildBotFarcasterAlreadyRegisteredError);

    expect(sendUserOperationMock).not.toHaveBeenCalled();
  });

  it("returns needs_funding when custody wallet balance is insufficient", async () => {
    readContractMock.mockResolvedValueOnce(0n).mockResolvedValueOnce(7_000_000_000_000_000n);
    getBalanceMock.mockResolvedValueOnce(0n);

    const result = await signupBuildBotFarcaster({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
    });

    expect(result.status).toBe("needs_funding");
    if (result.status === "needs_funding") {
      expect(result.network).toBe("optimism");
      expect(result.requiredWei).toBe("7200000000000000");
      expect(result.custodyAddress).toBe("0x00000000000000000000000000000000000000aa");
      expect(result.recoveryAddress).toBe("0x0000000000000000000000000000000000000001");
    }

    expect(sendUserOperationMock).not.toHaveBeenCalled();
  });

  it("registers FID and adds signer key when funded", async () => {
    readContractMock
      .mockResolvedValueOnce(0n)
      .mockResolvedValueOnce(7_000_000_000_000_000n)
      .mockResolvedValueOnce(555n);
    getBalanceMock.mockResolvedValueOnce(9_000_000_000_000_000n);
    sendUserOperationMock.mockResolvedValueOnce({ userOpHash: "0xsignup" });
    waitForUserOperationMock.mockResolvedValueOnce({
      status: "complete",
      transactionHash: "0xaaa",
    });

    const result = await signupBuildBotFarcaster({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
      recoveryAddress: "0x0000000000000000000000000000000000000009",
    });

    expect(result).toEqual({
      status: "complete",
      network: "optimism",
      ownerAddress: "0x0000000000000000000000000000000000000001",
      custodyAddress: "0x00000000000000000000000000000000000000aa",
      recoveryAddress: "0x0000000000000000000000000000000000000009",
      fid: "555",
      idGatewayPriceWei: "7000000000000000",
      txHash: "0xaaa",
    });

    expect(sendUserOperationMock).toHaveBeenCalledTimes(1);
    expect(waitForUserOperationMock).toHaveBeenCalledTimes(1);
  });

  it("throws when user operation does not complete", async () => {
    readContractMock.mockResolvedValueOnce(0n).mockResolvedValueOnce(7_000_000_000_000_000n);
    getBalanceMock.mockResolvedValueOnce(9_000_000_000_000_000n);
    sendUserOperationMock.mockResolvedValueOnce({ userOpHash: "0xsignup" });
    waitForUserOperationMock.mockResolvedValueOnce({ status: "failed", transactionHash: null });

    await expect(
      signupBuildBotFarcaster({
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
        signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
      })
    ).rejects.toBeInstanceOf(BuildBotFarcasterUserOperationError);
  });
});
