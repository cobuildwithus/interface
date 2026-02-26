/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { zeroAddress } from "viem";

const useRevnetDataMock = vi.fn();
const useContractTransactionMock = vi.fn();

vi.mock("@/lib/hooks/use-revnet-data", () => ({
  useRevnetData: (projectId?: bigint) => useRevnetDataMock(projectId),
}));
vi.mock("@/lib/domains/token/onchain/use-contract-transaction", () => ({
  useContractTransaction: (opts: Parameters<typeof useContractTransactionMock>[0]) =>
    useContractTransactionMock(opts),
}));

import { useRevnetPay } from "@/lib/hooks/use-revnet-pay";
import {
  COBUILD_SWAP_PROJECT_ID,
  REVNET_CHAIN_ID,
  NATIVE_TOKEN,
} from "@/lib/domains/token/onchain/revnet";

const ACCOUNT = "0x" + "a".repeat(40);

describe("useRevnetPay", () => {
  beforeEach(() => {
    useRevnetDataMock.mockReset();
    useContractTransactionMock.mockReset();
  });

  it("throws when terminal not ready", async () => {
    useRevnetDataMock.mockReturnValue({ data: null, isLoading: false });
    useContractTransactionMock.mockReturnValue({
      prepareWallet: vi.fn(),
      writeContractAsync: vi.fn(),
      isPending: false,
      isConfirming: false,
      isConfirmed: false,
      isLoading: false,
      hash: undefined,
      error: null,
      account: ACCOUNT,
    });

    const { result } = renderHook(() => useRevnetPay());

    await expect(result.current.pay("0.01")).rejects.toThrow("Terminal not found");
  });

  it("throws when account missing", async () => {
    useRevnetDataMock.mockReturnValue({
      data: { terminalAddress: ACCOUNT, supportsEthPayments: true },
      isLoading: false,
    });
    useContractTransactionMock.mockReturnValue({
      prepareWallet: vi.fn(),
      writeContractAsync: vi.fn(),
      isPending: false,
      isConfirming: false,
      isConfirmed: false,
      isLoading: false,
      hash: undefined,
      error: null,
      account: null,
    });

    const { result } = renderHook(() => useRevnetPay());

    await expect(result.current.pay("0.01")).rejects.toThrow("Wallet not connected");
  });

  it("invokes writeContractAsync when ready", async () => {
    const prepareWallet = vi.fn();
    const writeContractAsync = vi.fn();

    useRevnetDataMock.mockReturnValue({
      data: { terminalAddress: ACCOUNT, supportsEthPayments: true },
      isLoading: false,
    });
    useContractTransactionMock.mockReturnValue({
      prepareWallet,
      writeContractAsync,
      isPending: false,
      isConfirming: false,
      isConfirmed: false,
      isLoading: false,
      hash: undefined,
      error: null,
      account: ACCOUNT,
    });

    const { result } = renderHook(() => useRevnetPay({ projectId: COBUILD_SWAP_PROJECT_ID }));

    await act(async () => {
      await result.current.pay("0.01", { memo: "hi" });
    });

    expect(prepareWallet).toHaveBeenCalled();
    expect(writeContractAsync).toHaveBeenCalledWith({
      address: ACCOUNT,
      abi: expect.any(Array),
      functionName: "pay",
      args: [COBUILD_SWAP_PROJECT_ID, NATIVE_TOKEN, expect.any(BigInt), ACCOUNT, 0n, "hi", "0x"],
      value: expect.any(BigInt),
      chainId: REVNET_CHAIN_ID,
    });
  });

  it("marks not ready when terminal is zero address", () => {
    useRevnetDataMock.mockReturnValue({
      data: { terminalAddress: zeroAddress, supportsEthPayments: true },
      isLoading: false,
    });
    useContractTransactionMock.mockReturnValue({
      prepareWallet: vi.fn(),
      writeContractAsync: vi.fn(),
      isPending: false,
      isConfirming: false,
      isConfirmed: false,
      isLoading: false,
      hash: undefined,
      error: null,
      account: ACCOUNT,
    });

    const { result } = renderHook(() => useRevnetPay());
    expect(result.current.isReady).toBe(false);
  });

  it("throws when eth payments are unsupported", async () => {
    useRevnetDataMock.mockReturnValue({
      data: { terminalAddress: ACCOUNT, supportsEthPayments: false },
      isLoading: false,
    });
    useContractTransactionMock.mockReturnValue({
      prepareWallet: vi.fn(),
      writeContractAsync: vi.fn(),
      isPending: false,
      isConfirming: false,
      isConfirmed: false,
      isLoading: false,
      hash: undefined,
      error: null,
      account: ACCOUNT,
    });

    const { result } = renderHook(() => useRevnetPay());

    await expect(result.current.pay("0.01")).rejects.toThrow(
      "ETH payments are unavailable for this project"
    );
  });
});
