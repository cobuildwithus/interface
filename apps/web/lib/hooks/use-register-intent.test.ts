/**
 * @vitest-environment happy-dom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BASE_CHAIN_ID } from "@/lib/domains/token/onchain/addresses";
import { useRegisterIntent } from "./use-register-intent";

const { registerDirectIntentActionMock } = vi.hoisted(() => ({
  registerDirectIntentActionMock: vi.fn(),
}));

vi.mock("@/app/(app)/actions/swaps-direct-intent", () => ({
  registerDirectIntentAction: (...args: Parameters<typeof registerDirectIntentActionMock>) =>
    registerDirectIntentActionMock(...args),
}));

const TOKEN_ADDRESS = ("0x" + "b".repeat(40)) as `0x${string}`;
const RECIPIENT = ("0x" + "c".repeat(40)) as `0x${string}`;
const TX_HASH = "0x" + "a".repeat(64);

describe("useRegisterIntent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    registerDirectIntentActionMock.mockReset();
  });

  it("returns early with a user-facing error when entityId/castHash is missing", async () => {
    const { result } = renderHook(() =>
      useRegisterIntent({
        tokenAddress: TOKEN_ADDRESS,
      })
    );

    await act(async () => {
      await result.current.registerIntent(TX_HASH);
    });

    expect(registerDirectIntentActionMock).not.toHaveBeenCalled();
    expect(result.current.isRegistering).toBe(false);
    expect(result.current.canRetry).toBe(false);
    expect(result.current.registerError).toBe(
      "Missing submission id; cannot record boost. Contact @rocketman."
    );
  });

  it("registers intent with normalized entityId and sets error + canRetry on failure", async () => {
    registerDirectIntentActionMock.mockResolvedValue({ ok: false, error: "boom" });

    const { result } = renderHook(() =>
      useRegisterIntent({
        entityId: "D".repeat(40),
        tokenAddress: TOKEN_ADDRESS,
        beneficiaryAddress: RECIPIENT,
      })
    );

    await act(async () => {
      await result.current.registerIntent(TX_HASH);
    });

    expect(registerDirectIntentActionMock).toHaveBeenCalledTimes(1);
    expect(registerDirectIntentActionMock).toHaveBeenCalledWith({
      txHash: TX_HASH,
      chainId: BASE_CHAIN_ID,
      tokenAddress: TOKEN_ADDRESS,
      entityId: `0x${"d".repeat(40)}`,
      recipient: RECIPIENT,
    });

    expect(result.current.isRegistering).toBe(false);
    expect(result.current.registerError).toBe("boom");
    expect(result.current.canRetry).toBe(true);
  });

  it("retries with the last tx hash", async () => {
    registerDirectIntentActionMock
      .mockResolvedValueOnce({ ok: false, error: "boom" })
      .mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() =>
      useRegisterIntent({
        castHash: `0x${"e".repeat(40)}`,
        tokenAddress: TOKEN_ADDRESS,
      })
    );

    await act(async () => {
      await result.current.registerIntent(TX_HASH);
    });

    expect(result.current.canRetry).toBe(true);

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(registerDirectIntentActionMock).toHaveBeenCalledTimes(2);
      expect(result.current.canRetry).toBe(false);
      expect(result.current.registerError).toBeNull();
    });
  });

  it("calls onSuccess and clears error state on success", async () => {
    registerDirectIntentActionMock.mockResolvedValue({ ok: true });

    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useRegisterIntent({
        entityId: `0x${"f".repeat(40)}`,
        tokenAddress: TOKEN_ADDRESS,
        onSuccess,
      })
    );

    await act(async () => {
      await result.current.registerIntent(TX_HASH);
    });

    expect(onSuccess).toHaveBeenCalledWith(TX_HASH);
    expect(result.current.registerError).toBeNull();
    expect(result.current.canRetry).toBe(false);
  });

  it("uses a generic error message when action throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    registerDirectIntentActionMock.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() =>
      useRegisterIntent({
        entityId: `0x${"f".repeat(40)}`,
        tokenAddress: TOKEN_ADDRESS,
      })
    );

    await act(async () => {
      await result.current.registerIntent(TX_HASH);
    });

    expect(result.current.registerError).toBe(
      "Unexpected error recording boost. Retry or contact @rocketman."
    );
    expect(result.current.canRetry).toBe(true);
  });
});
