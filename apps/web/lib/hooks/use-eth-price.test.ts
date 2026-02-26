/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { DEFAULT_ETH_PRICE_USDC } from "@/lib/domains/token/onchain/addresses";

const swrMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("swr", () => ({
  default: (...args: unknown[]) => swrMock(...args),
}));

import { useEthPrice } from "@/lib/hooks/use-eth-price";

describe("useEthPrice", () => {
  beforeEach(() => {
    swrMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("configures SWR and fetches ETH price from the API when response is OK", async () => {
    swrMock.mockReturnValue({ data: { priceUsdc: DEFAULT_ETH_PRICE_USDC }, isLoading: false });

    renderHook(() => useEthPrice());

    const [key, fetcher, options] = swrMock.mock.calls[0] as [
      string,
      () => Promise<{ priceUsdc: number }>,
      { refreshInterval: number; fallbackData: { priceUsdc: number } },
    ];

    expect(key).toBe("eth-price");
    expect(options).toEqual({
      refreshInterval: 5 * 60 * 1000,
      fallbackData: { priceUsdc: DEFAULT_ETH_PRICE_USDC },
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ priceUsdc: 3210 }),
    });

    await expect(fetcher()).resolves.toEqual({ priceUsdc: 3210 });
    expect(fetchMock).toHaveBeenCalledWith("/api/eth-price");
  });

  it("falls back to default price when the API response is not OK", async () => {
    swrMock.mockReturnValue({ data: { priceUsdc: DEFAULT_ETH_PRICE_USDC }, isLoading: false });

    renderHook(() => useEthPrice());

    const [, fetcher] = swrMock.mock.calls[0] as [string, () => Promise<{ priceUsdc: number }>];
    fetchMock.mockResolvedValueOnce({ ok: false });

    await expect(fetcher()).resolves.toEqual({ priceUsdc: DEFAULT_ETH_PRICE_USDC });
  });

  it("returns SWR data and converts USD to ETH with 8 decimal precision", () => {
    swrMock.mockReturnValue({ data: { priceUsdc: 2500 }, isLoading: true });

    const { result } = renderHook(() => useEthPrice());

    expect(result.current.ethPriceUsdc).toBe(2500);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.usdToEth(1)).toBe("0.00040000");
    expect(result.current.usdToEth(1250)).toBe("0.50000000");
  });

  it("uses default price when SWR data is missing", () => {
    swrMock.mockReturnValue({ data: undefined, isLoading: false });

    const { result } = renderHook(() => useEthPrice());

    expect(result.current.ethPriceUsdc).toBe(DEFAULT_ETH_PRICE_USDC);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.usdToEth(DEFAULT_ETH_PRICE_USDC)).toBe("1.00000000");
  });
});
