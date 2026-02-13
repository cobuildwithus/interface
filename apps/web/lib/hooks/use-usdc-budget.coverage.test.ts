/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { contracts } from "@/lib/domains/token/onchain/addresses";

const useAccountMock = vi.fn();
const useReadContractMock = vi.fn();

vi.mock("wagmi", () => ({
  useAccount: () => useAccountMock(),
  useReadContract: (args: Parameters<typeof useReadContractMock>[0]) => useReadContractMock(args),
}));

import { useUsdcBudget } from "@/lib/hooks/use-usdc-budget";

describe("useUsdcBudget", () => {
  beforeEach(() => {
    useAccountMock.mockReset();
    useReadContractMock.mockReset();
  });

  it("returns allowance when connected", () => {
    useAccountMock.mockReturnValue({ address: "0x" + "1".repeat(40) });
    useReadContractMock.mockReturnValue({ data: 12345n, isLoading: false, refetch: vi.fn() });

    const { result } = renderHook(() => useUsdcBudget());

    expect(result.current.allowance).toBe(12345n);
    expect(result.current.loading).toBe(false);
    expect(useReadContractMock).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "allowance",
        args: ["0x" + "1".repeat(40), contracts.CobuildSwap],
      })
    );
  });

  it("skips args when no address", () => {
    useAccountMock.mockReturnValue({ address: undefined });
    useReadContractMock.mockReturnValue({ data: undefined, isLoading: true, refetch: vi.fn() });

    const { result } = renderHook(() => useUsdcBudget());

    expect(result.current.allowance).toBeNull();
    expect(useReadContractMock).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "allowance",
        args: undefined,
      })
    );
  });
});
