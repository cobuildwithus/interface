/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const useAccountMock = vi.fn();
const useReadContractMock = vi.fn();

vi.mock("wagmi", () => ({
  useAccount: () => useAccountMock(),
  useReadContract: (args: Parameters<typeof useReadContractMock>[0]) => useReadContractMock(args),
}));

import { useUsdcBalance } from "@/lib/hooks/use-usdc-balance";

describe("useUsdcBalance", () => {
  beforeEach(() => {
    useAccountMock.mockReset();
    useReadContractMock.mockReset();
  });

  it("formats balance when connected", () => {
    useAccountMock.mockReturnValue({ address: "0x" + "2".repeat(40) });
    useReadContractMock.mockReturnValue({ data: 1250000n, isLoading: false, refetch: vi.fn() });

    const { result } = renderHook(() => useUsdcBalance());

    expect(result.current.usdcBalance).toBe(1250000n);
    expect(result.current.balanceUsd).toBe("1.25");
  });

  it("returns null balance when disconnected", () => {
    useAccountMock.mockReturnValue({ address: undefined });
    useReadContractMock.mockReturnValue({ data: undefined, isLoading: true, refetch: vi.fn() });

    const { result } = renderHook(() => useUsdcBalance());

    expect(result.current.usdcBalance).toBeNull();
    expect(result.current.balanceUsd).toBeNull();
  });
});
