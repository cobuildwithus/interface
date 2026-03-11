import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FARCASTER_CONTRACTS,
  FARCASTER_ID_GATEWAY_ABI,
  FARCASTER_KEY_GATEWAY_ABI,
  buildFarcasterSignupCompletedResult,
  buildFarcasterSignupNeedsFundingResult,
} from "@cobuild/wire";
import { decodeAbiParameters, decodeFunctionData } from "viem";

vi.mock("server-only", () => ({}));
vi.mock("@cobuild/wire", async () => {
  return await vi.importActual<typeof import("@cobuild/wire")>("@cobuild/wire");
});

const { getClientMock, getOrCreateCliAgentSmartAccountMock } = vi.hoisted(() => ({
  getClientMock: vi.fn(),
  getOrCreateCliAgentSmartAccountMock: vi.fn(),
}));

vi.mock("@/lib/domains/token/onchain/clients", () => ({
  getClient: (...args: unknown[]) => getClientMock(...args),
}));

vi.mock("@/lib/server/cli/wallet-store", () => ({
  getOrCreateCliAgentSmartAccount: (...args: unknown[]) =>
    getOrCreateCliAgentSmartAccountMock(...args),
}));

import {
  CliFarcasterAlreadyRegisteredError,
  CliFarcasterUserOperationError,
  signupCliFarcaster,
} from "./farcaster-signup";

const TX_HASH = `0x${"aa".repeat(32)}`;

describe("cli farcaster signup service", () => {
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

    getOrCreateCliAgentSmartAccountMock.mockResolvedValue({
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
      signupCliFarcaster({
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
        signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
      })
    ).rejects.toBeInstanceOf(CliFarcasterAlreadyRegisteredError);

    expect(readContractMock).toHaveBeenCalledTimes(1);
    expect(getBalanceMock).not.toHaveBeenCalled();
    expect(sendUserOperationMock).not.toHaveBeenCalled();
  });

  it("returns needs_funding when custody wallet balance is insufficient", async () => {
    readContractMock.mockResolvedValueOnce(0n).mockResolvedValueOnce(7_000_000_000_000_000n);
    getBalanceMock.mockResolvedValueOnce(0n);

    const result = await signupCliFarcaster({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
    });

    expect(result.status).toBe("needs_funding");
    expect(result).toEqual(
      buildFarcasterSignupNeedsFundingResult({
        ownerAddress: "0x0000000000000000000000000000000000000001",
        custodyAddress: "0x00000000000000000000000000000000000000aa",
        recoveryAddress: "0x0000000000000000000000000000000000000001",
        idGatewayPriceWei: 7_000_000_000_000_000n,
        balanceWei: 0n,
        requiredWei: 7_200_000_000_000_000n,
      })
    );

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
      transactionHash: TX_HASH,
    });

    const result = await signupCliFarcaster({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
      recoveryAddress: "0x0000000000000000000000000000000000000009",
    });

    expect(result).toEqual(
      buildFarcasterSignupCompletedResult({
        ownerAddress: "0x0000000000000000000000000000000000000001",
        custodyAddress: "0x00000000000000000000000000000000000000aa",
        recoveryAddress: "0x0000000000000000000000000000000000000009",
        fid: 555n,
        idGatewayPriceWei: 7_000_000_000_000_000n,
        txHash: TX_HASH,
      })
    );

    expect(sendUserOperationMock).toHaveBeenCalledTimes(1);
    expect(waitForUserOperationMock).toHaveBeenCalledTimes(1);
  });

  it("uses wire signup call plan outputs for user operation payloads", async () => {
    readContractMock
      .mockResolvedValueOnce(0n)
      .mockResolvedValueOnce(7_000_000_000_000_000n)
      .mockResolvedValueOnce(555n);
    getBalanceMock.mockResolvedValueOnce(9_000_000_000_000_000n);
    sendUserOperationMock.mockResolvedValueOnce({ userOpHash: "0xsignup" });
    waitForUserOperationMock.mockResolvedValueOnce({
      status: "complete",
      transactionHash: TX_HASH,
    });

    await signupCliFarcaster({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      signerPublicKey: "0xAABBCCDDEEFF00112233445566778899AABBCCDDEEFF00112233445566778899",
      recoveryAddress: "0x0000000000000000000000000000000000000009",
      extraStorage: 2n,
    });

    expect(sendUserOperationMock).toHaveBeenCalledTimes(1);
    expect(readContractMock).toHaveBeenNthCalledWith(2, {
      address: FARCASTER_CONTRACTS.idGateway,
      abi: FARCASTER_ID_GATEWAY_ABI,
      functionName: "price",
      args: [2n],
    });
    const userOperation = sendUserOperationMock.mock.calls[0]?.[0] as {
      network: string;
      calls: Array<{ to: `0x${string}`; data: `0x${string}`; value: bigint }>;
    };
    expect(userOperation.network).toBe("optimism");
    expect(userOperation.calls).toHaveLength(2);

    const registerCall = userOperation.calls[0];
    expect(registerCall.to).toBe(FARCASTER_CONTRACTS.idGateway);
    expect(registerCall.value).toBe(7_000_000_000_000_000n);
    const decodedRegisterCall = decodeFunctionData({
      abi: FARCASTER_ID_GATEWAY_ABI,
      data: registerCall.data,
    });
    expect(decodedRegisterCall.functionName).toBe("register");
    expect(decodedRegisterCall.args).toEqual(["0x0000000000000000000000000000000000000009", 2n]);

    const addKeyCall = userOperation.calls[1];
    expect(addKeyCall.to).toBe(FARCASTER_CONTRACTS.keyGateway);
    expect(addKeyCall.value).toBe(0n);
    const decodedAddKeyCall = decodeFunctionData({
      abi: FARCASTER_KEY_GATEWAY_ABI,
      data: addKeyCall.data,
    });
    expect(decodedAddKeyCall.functionName).toBe("add");
    const [keyType, key, metadataType, metadata] = decodedAddKeyCall.args as [
      number,
      `0x${string}`,
      number,
      `0x${string}`,
    ];
    expect(BigInt(keyType)).toBe(1n);
    expect(key).toBe("0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899");
    expect(BigInt(metadataType)).toBe(1n);

    const [decodedMetadata] = decodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { name: "requestFid", type: "uint256" },
            { name: "requestSigner", type: "address" },
            { name: "signature", type: "bytes" },
            { name: "deadline", type: "uint256" },
          ],
        },
      ],
      metadata
    );
    expect(decodedMetadata.requestFid).toBe(0n);
    expect(decodedMetadata.requestSigner).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(decodedMetadata.signature).toMatch(/^0x[a-fA-F0-9]+$/);
    expect(decodedMetadata.deadline).toBeGreaterThan(0n);
  });

  it("throws when user operation does not complete", async () => {
    readContractMock.mockResolvedValueOnce(0n).mockResolvedValueOnce(7_000_000_000_000_000n);
    getBalanceMock.mockResolvedValueOnce(9_000_000_000_000_000n);
    sendUserOperationMock.mockResolvedValueOnce({ userOpHash: "0xsignup" });
    waitForUserOperationMock.mockResolvedValueOnce({ status: "failed", transactionHash: null });

    await expect(
      signupCliFarcaster({
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
        signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
      })
    ).rejects.toBeInstanceOf(CliFarcasterUserOperationError);
  });

  it("throws when signup confirms but custody wallet still has no FID", async () => {
    readContractMock
      .mockResolvedValueOnce(0n)
      .mockResolvedValueOnce(7_000_000_000_000_000n)
      .mockResolvedValueOnce(0n);
    getBalanceMock.mockResolvedValueOnce(9_000_000_000_000_000n);
    sendUserOperationMock.mockResolvedValueOnce({ userOpHash: "0xsignup" });
    waitForUserOperationMock.mockResolvedValueOnce({
      status: "complete",
      transactionHash: TX_HASH,
    });

    await expect(
      signupCliFarcaster({
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
        signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
      })
    ).rejects.toMatchObject({
      message: "Farcaster signup confirmed but FID was not assigned to custody address",
    });
  });
});
