/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { contracts } from "@/lib/domains/token/onchain/addresses";
import { BaseError } from "viem";

const usePublicClientMock = vi.fn();
const signTypedDataAsyncMock = vi.fn();
const submitUsdcPermitMock = vi.fn();

const address = (char: string) => `0x${char.repeat(40)}` as `0x${string}`;

vi.mock("wagmi", () => ({
  usePublicClient: (args: Parameters<typeof usePublicClientMock>[0]) => usePublicClientMock(args),
  useSignTypedData: () => ({ signTypedDataAsync: signTypedDataAsyncMock }),
}));

vi.mock("@/lib/domains/token/onchain/usdc-permit", () => ({
  submitUsdcPermit: (...args: Parameters<typeof submitUsdcPermitMock>) =>
    submitUsdcPermitMock(...args),
}));

import { useSignUsdcPermit } from "@/lib/hooks/use-usdc-permit";

describe("useSignUsdcPermit", () => {
  beforeEach(() => {
    usePublicClientMock.mockReset();
    signTypedDataAsyncMock.mockReset();
    submitUsdcPermitMock.mockReset();
  });

  it("signs and submits a permit", async () => {
    const readContract = vi
      .fn()
      .mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === "name") return "USD Coin";
        if (functionName === "version") return "";
        if (functionName === "nonces") return 7n;
        return undefined;
      });

    usePublicClientMock.mockReturnValue({ readContract });
    signTypedDataAsyncMock.mockResolvedValue(`0x${"11".repeat(65)}` as `0x${string}`);
    submitUsdcPermitMock.mockResolvedValue({
      success: true,
      txHash: "0x" + "22".repeat(32),
    });

    const { result } = renderHook(() => useSignUsdcPermit());
    const response = await result.current.signPermit({
      spender: contracts.CobuildSwap,
      value: 100n,
      owner: address("3"),
    });

    expect(readContract).toHaveBeenCalled();
    expect(signTypedDataAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: expect.objectContaining({ version: "2" }),
      })
    );
    expect(submitUsdcPermitMock).toHaveBeenCalled();
    expect(response.serverTxHash).toBe("0x" + "22".repeat(32));
  });

  it("throws when permit submission fails", async () => {
    usePublicClientMock.mockReturnValue({
      readContract: vi.fn().mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === "name") return "USD Coin";
        if (functionName === "version") return "2";
        if (functionName === "nonces") return 1n;
        return undefined;
      }),
    });
    signTypedDataAsyncMock.mockResolvedValue(`0x${"11".repeat(65)}` as `0x${string}`);
    submitUsdcPermitMock.mockResolvedValue({ error: "Boom" });

    const { result } = renderHook(() => useSignUsdcPermit());

    await expect(
      result.current.signPermit({
        spender: contracts.CobuildSwap,
        value: 100n,
        owner: address("4"),
      })
    ).rejects.toThrow("Boom");
  });

  it("throws when permit submission returns unexpected payload", async () => {
    usePublicClientMock.mockReturnValue({
      readContract: vi.fn().mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === "name") return "USD Coin";
        if (functionName === "version") return "2";
        if (functionName === "nonces") return 2n;
        return undefined;
      }),
    });
    signTypedDataAsyncMock.mockResolvedValue(`0x${"11".repeat(65)}` as `0x${string}`);
    submitUsdcPermitMock.mockResolvedValue({});

    const { result } = renderHook(() => useSignUsdcPermit());

    await expect(
      result.current.signPermit({
        spender: contracts.CobuildSwap,
        value: 100n,
        owner: address("5"),
      })
    ).rejects.toThrow("Permit submission failed");
  });

  it("throws a user rejected error when signature is rejected", async () => {
    usePublicClientMock.mockReturnValue({
      readContract: vi.fn().mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === "name") return "USD Coin";
        if (functionName === "version") return "2";
        if (functionName === "nonces") return 2n;
        return undefined;
      }),
    });
    signTypedDataAsyncMock.mockRejectedValue(new Error("User rejected the request."));

    const { result } = renderHook(() => useSignUsdcPermit());

    await expect(
      result.current.signPermit({
        spender: contracts.CobuildSwap,
        value: 100n,
        owner: address("6"),
      })
    ).rejects.toMatchObject({ code: "USER_REJECTED" });
  });

  it("handles BaseError rejections", async () => {
    usePublicClientMock.mockReturnValue({
      readContract: vi.fn().mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === "name") return "USD Coin";
        if (functionName === "version") return "2";
        if (functionName === "nonces") return 3n;
        return undefined;
      }),
    });

    class TestBaseError extends BaseError {
      constructor() {
        super("User rejected the request.");
        (this as { shortMessage?: string }).shortMessage = "User rejected the request.";
      }
    }
    signTypedDataAsyncMock.mockRejectedValue(new TestBaseError());

    const { result } = renderHook(() => useSignUsdcPermit());

    await expect(
      result.current.signPermit({
        spender: contracts.CobuildSwap,
        value: 100n,
        owner: address("7"),
      })
    ).rejects.toMatchObject({ code: "USER_REJECTED" });
  });

  it("throws when no public client", async () => {
    usePublicClientMock.mockReturnValue(null);

    const { result } = renderHook(() => useSignUsdcPermit());

    await expect(
      result.current.signPermit({
        spender: contracts.CobuildSwap,
        value: 100n,
        owner: address("8"),
      })
    ).rejects.toThrow("No public client");
  });
});
