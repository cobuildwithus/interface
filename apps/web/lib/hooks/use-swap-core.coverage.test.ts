/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const useAccountMock = vi.fn();
const useBalanceMock = vi.fn();
const usePaymentQuoteMock = vi.fn();
const useRevnetPayMock = vi.fn();
const getEthForTokensMock = vi.fn();
const isValidDecimalInputMock = vi.fn();
const getButtonStateMock = vi.fn();
const checkInsufficientBalanceMock = vi.fn();
const isSwapDisabledMock = vi.fn();
const formatUnitsMock = vi.fn();
const parseUnitsMock = vi.fn();

vi.mock("wagmi", () => ({
  useAccount: () => useAccountMock(),
  useBalance: () => useBalanceMock(),
}));

vi.mock("@/lib/hooks/use-payment-quote", () => ({
  usePaymentQuote: (amount: string, projectId?: bigint) => usePaymentQuoteMock(amount, projectId),
}));

vi.mock("@/lib/hooks/use-revnet-pay", () => ({
  useRevnetPay: (options: Parameters<typeof useRevnetPayMock>[0]) => useRevnetPayMock(options),
}));

vi.mock("@/lib/domains/token/onchain/quote", () => ({
  getEthForTokens: (...args: Parameters<typeof getEthForTokensMock>) =>
    getEthForTokensMock(...args),
}));

vi.mock("@/lib/domains/token/onchain/swap-utils", () => ({
  BUTTON_TEXT: { ready: "Swap" },
  isValidDecimalInput: (value: string) => isValidDecimalInputMock(value),
  getButtonState: (args: Parameters<typeof getButtonStateMock>[0]) => getButtonStateMock(args),
  checkInsufficientBalance: (...args: Parameters<typeof checkInsufficientBalanceMock>) =>
    checkInsufficientBalanceMock(...args),
  isSwapDisabled: (state: string, amount: string) => isSwapDisabledMock(state, amount),
}));

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    formatUnits: (...args: Parameters<typeof formatUnitsMock>) => formatUnitsMock(...args),
    parseUnits: (...args: Parameters<typeof parseUnitsMock>) => parseUnitsMock(...args),
  };
});

import { useSwapCore } from "@/lib/hooks/use-swap-core";
import { COBUILD_SWAP_PROJECT_ID } from "@/lib/domains/token/onchain/revnet";

const ACCOUNT = ("0x" + "a".repeat(40)) as `0x${string}`;

describe("useSwapCore", () => {
  beforeEach(() => {
    useAccountMock.mockReset();
    useBalanceMock.mockReset();
    usePaymentQuoteMock.mockReset();
    useRevnetPayMock.mockReset();
    getEthForTokensMock.mockReset();
    isValidDecimalInputMock.mockReset();
    getButtonStateMock.mockReset();
    checkInsufficientBalanceMock.mockReset();
    isSwapDisabledMock.mockReset();

    useAccountMock.mockReturnValue({ address: ACCOUNT });
    useBalanceMock.mockReturnValue({ data: { value: 1000n } });
    usePaymentQuoteMock.mockReturnValue({
      formattedQuote: { payerTokens: "10" },
      isLoading: false,
      isPaused: false,
      reservedPercent: 10,
      weight: 100n,
    });
    useRevnetPayMock.mockReturnValue({
      pay: vi.fn(),
      isLoading: false,
      isReady: true,
      supportsEthPayments: true,
    });
    getEthForTokensMock.mockReturnValue(1000n);
    isValidDecimalInputMock.mockReturnValue(true);
    getButtonStateMock.mockReturnValue("ready");
    checkInsufficientBalanceMock.mockReturnValue(false);
    isSwapDisabledMock.mockReturnValue(false);
    formatUnitsMock.mockReturnValue("0.5");
    parseUnitsMock.mockReturnValue(1000n);
  });

  it("updates pay amount when valid input", () => {
    const { result } = renderHook(() => useSwapCore());

    act(() => {
      result.current.onPayAmountChange("0.1");
    });
    expect(result.current.payAmount).toBe("0.1");
  });

  it("passes projectId through to revnet hooks", () => {
    renderHook(() => useSwapCore({ projectId: COBUILD_SWAP_PROJECT_ID }));

    expect(usePaymentQuoteMock).toHaveBeenCalledWith(expect.any(String), COBUILD_SWAP_PROJECT_ID);
    expect(useRevnetPayMock).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: COBUILD_SWAP_PROJECT_ID })
    );
  });

  it("ignores invalid decimal input", () => {
    isValidDecimalInputMock.mockReturnValue(false);
    const { result } = renderHook(() => useSwapCore());

    act(() => {
      result.current.onPayAmountChange("bad");
    });
    expect(result.current.payAmount).toBe("");
  });

  it("handles token input and sets pay amount", () => {
    const { result } = renderHook(() => useSwapCore());

    act(() => {
      result.current.onTokensChange("1,000");
    });

    expect(getEthForTokensMock).toHaveBeenCalled();
    expect(result.current.payAmount).toBe("0.5");
  });

  it("skips token updates when input is invalid", () => {
    isValidDecimalInputMock.mockReturnValue(false);
    const { result } = renderHook(() => useSwapCore());

    act(() => {
      result.current.onTokensChange("bad");
    });

    expect(getEthForTokensMock).not.toHaveBeenCalled();
    expect(result.current.payAmount).toBe("");
  });

  it("ignores token updates when quote data is missing", () => {
    usePaymentQuoteMock.mockReturnValueOnce({
      formattedQuote: { payerTokens: "10" },
      isLoading: false,
      isPaused: false,
      reservedPercent: null,
      weight: null,
    });
    const { result } = renderHook(() => useSwapCore());

    act(() => {
      result.current.onTokensChange("10");
    });

    expect(getEthForTokensMock).not.toHaveBeenCalled();
    expect(result.current.payAmount).toBe("");
  });

  it("clears pay amount for NaN or zero tokens", () => {
    const { result } = renderHook(() => useSwapCore());

    act(() => {
      result.current.onTokensChange("0");
    });
    expect(result.current.payAmount).toBe("");

    act(() => {
      result.current.onTokensChange("NaN");
    });
    expect(result.current.payAmount).toBe("");
  });

  it("clears pay amount for invalid token input", () => {
    getEthForTokensMock.mockImplementation(() => {
      throw new Error("boom");
    });
    parseUnitsMock.mockImplementation(() => {
      throw new Error("bad units");
    });
    const { result } = renderHook(() => useSwapCore());

    act(() => {
      result.current.onTokensChange("1");
    });

    expect(result.current.payAmount).toBe("");
  });

  it("handles max click", () => {
    useBalanceMock.mockReturnValueOnce({ data: { value: 1000000000000000000n } });
    const { result } = renderHook(() => useSwapCore());

    act(() => {
      result.current.onMaxClick();
    });

    expect(result.current.payAmount).toBe("0.5");
  });

  it("ignores max click when no balance or insufficient buffer", () => {
    useBalanceMock.mockReturnValueOnce({ data: undefined });
    const { result, rerender } = renderHook(() => useSwapCore());

    act(() => {
      result.current.onMaxClick();
    });
    expect(result.current.payAmount).toBe("");

    useBalanceMock.mockReturnValueOnce({ data: { value: 1n } });
    rerender();
    act(() => {
      result.current.onMaxClick();
    });
    expect(result.current.payAmount).toBe("");
  });

  it("skips swap when disabled", async () => {
    isSwapDisabledMock.mockReturnValue(true);
    const pay = vi.fn();
    useRevnetPayMock.mockReturnValue({ pay, isLoading: false, isReady: true });

    const { result } = renderHook(() => useSwapCore());
    await act(async () => {
      await result.current.onSwap("memo");
    });

    expect(pay).not.toHaveBeenCalled();
  });

  it("calls pay with memo and beneficiary", async () => {
    const pay = vi.fn();
    useRevnetPayMock.mockReturnValue({ pay, isLoading: false, isReady: true });

    const { result } = renderHook(() => useSwapCore({ beneficiaryAddress: ACCOUNT }));

    act(() => {
      result.current.onPayAmountChange("0.2");
    });

    await act(async () => {
      await result.current.onSwap("memo");
    });

    expect(pay).toHaveBeenCalledWith("0.2", { memo: "memo", beneficiary: ACCOUNT });
  });
});
