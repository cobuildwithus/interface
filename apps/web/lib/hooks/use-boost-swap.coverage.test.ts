/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const useSwapCoreMock = vi.fn();
const useEthPriceMock = vi.fn();

vi.mock("@/lib/hooks/use-swap-core", () => ({
  useSwapCore: (opts: Parameters<typeof useSwapCoreMock>[0]) => useSwapCoreMock(opts),
}));
vi.mock("@/lib/hooks/use-eth-price", () => ({
  useEthPrice: () => useEthPriceMock(),
}));

import { useBoostSwap } from "@/lib/hooks/use-boost-swap";

describe("useBoostSwap", () => {
  beforeEach(() => {
    useSwapCoreMock.mockReset();
    useEthPriceMock.mockReset();
  });

  it("handles memo + presets + success callbacks", () => {
    const onPayAmountChange = vi.fn();
    const onSwap = vi.fn();

    useEthPriceMock.mockReturnValue({
      usdToEth: (usd: number) => (usd === 1 ? "0.0005" : "0.001"),
      ethPriceUsdc: 2000,
    });

    useSwapCoreMock.mockReturnValue({
      payAmount: "",
      formattedBalance: "0.00",
      isDisabled: false,
      buttonText: "Swap",
      hasWallet: true,
      onPayAmountChange,
      onMaxClick: vi.fn(),
      onSwap,
    });

    const onSuccess = vi.fn();
    const onTxConfirmed = vi.fn();

    const { result } = renderHook(() =>
      useBoostSwap({ onSuccess, onTxConfirmed, defaultMemo: "default" })
    );

    act(() => {
      result.current.onMemoChange("hello");
    });
    expect(result.current.memo).toBe("hello");

    act(() => {
      result.current.onPresetClick(1);
    });
    expect(onPayAmountChange).toHaveBeenCalledWith("0.0005");

    act(() => {
      result.current.onSwap();
    });
    expect(onSwap).toHaveBeenCalledWith("hello");

    const handleSuccess = useSwapCoreMock.mock.calls[0][0].onSuccess;
    act(() => {
      handleSuccess("0xhash");
    });

    expect(onSuccess).toHaveBeenCalledWith("0xhash");
    expect(onTxConfirmed).toHaveBeenCalledWith("0xhash");
    expect(result.current.memo).toBe("");
  });

  it("does not accept overlong memo", () => {
    useEthPriceMock.mockReturnValue({ usdToEth: () => "0", ethPriceUsdc: 2000 });
    useSwapCoreMock.mockReturnValue({
      payAmount: "",
      formattedBalance: "0.00",
      isDisabled: false,
      buttonText: "Swap",
      hasWallet: true,
      onPayAmountChange: vi.fn(),
      onMaxClick: vi.fn(),
      onSwap: vi.fn(),
    });

    const { result } = renderHook(() => useBoostSwap());
    act(() => {
      result.current.onMemoChange("a".repeat(600));
    });
    expect(result.current.memo).toBe("");
  });
});
