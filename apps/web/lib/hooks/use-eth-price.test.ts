/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { DEFAULT_ETH_PRICE_USDC } from "@/lib/domains/token/onchain/addresses";

const useQueryMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-query", () => ({
  useQuery: (args: Parameters<typeof useQueryMock>[0]) => useQueryMock(args),
}));

import { ETH_PRICE_QUERY_KEY } from "@/lib/hooks/query-keys";
import { useEthPrice } from "@/lib/hooks/use-eth-price";

describe("useEthPrice", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("configures React Query and fetches ETH price from the API when response is OK", async () => {
    useQueryMock.mockReturnValue({ data: { priceUsdc: DEFAULT_ETH_PRICE_USDC }, isLoading: false });

    renderHook(() => useEthPrice());

    const call = useQueryMock.mock.calls[0]?.[0];

    expect(call.queryKey).toEqual(ETH_PRICE_QUERY_KEY);
    expect(call).toMatchObject({
      refetchInterval: 5 * 60 * 1000,
      initialData: { priceUsdc: DEFAULT_ETH_PRICE_USDC },
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ priceUsdc: 3210 }),
    });

    await expect(call.queryFn()).resolves.toEqual({ priceUsdc: 3210 });
    expect(fetchMock).toHaveBeenCalledWith("/api/eth-price");
  });

  it("falls back to default price when the API response is not OK", async () => {
    useQueryMock.mockReturnValue({ data: { priceUsdc: DEFAULT_ETH_PRICE_USDC }, isLoading: false });

    renderHook(() => useEthPrice());

    fetchMock.mockResolvedValueOnce({ ok: false });

    const call = useQueryMock.mock.calls[0]?.[0];
    await expect(call.queryFn()).resolves.toEqual({ priceUsdc: DEFAULT_ETH_PRICE_USDC });
  });

  it("returns query data and converts USD to ETH with 8 decimal precision", () => {
    useQueryMock.mockReturnValue({ data: { priceUsdc: 2500 }, isLoading: true });

    const { result } = renderHook(() => useEthPrice());

    expect(result.current.ethPriceUsdc).toBe(2500);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.usdToEth(1)).toBe("0.00040000");
    expect(result.current.usdToEth(1250)).toBe("0.50000000");
  });

  it("uses default price when query data is missing", () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false });

    const { result } = renderHook(() => useEthPrice());

    expect(result.current.ethPriceUsdc).toBe(DEFAULT_ETH_PRICE_USDC);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.usdToEth(DEFAULT_ETH_PRICE_USDC)).toBe("1.00000000");
  });
});
