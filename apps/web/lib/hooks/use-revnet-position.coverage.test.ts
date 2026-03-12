/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { contracts, WETH_ADDRESS } from "@/lib/domains/token/onchain/addresses";

const useAccountMock = vi.fn();
const usePublicClientMock = vi.fn();
const useQueryMock = vi.fn();
const getRevnetCashOutContextMock = vi.fn();
const quoteRevnetCashOutMock = vi.fn();

vi.mock("wagmi", () => ({
  useAccount: () => useAccountMock(),
  usePublicClient: (args: Parameters<typeof usePublicClientMock>[0]) => usePublicClientMock(args),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (args: Parameters<typeof useQueryMock>[0]) => useQueryMock(args),
}));

vi.mock("@cobuild/wire", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cobuild/wire")>();
  return {
    ...actual,
    getRevnetCashOutContext: (...args: unknown[]) => getRevnetCashOutContextMock(...args),
    quoteRevnetCashOut: (...args: unknown[]) => quoteRevnetCashOutMock(...args),
  };
});

import {
  REVNET_CASH_OUT_QUOTE_QUERY_KEY,
  REVNET_POSITION_QUERY_KEY,
  useRevnetPosition,
} from "@/lib/hooks/use-revnet-position";

function mockQueryData({
  context,
  quote,
}: {
  context?: Record<string, unknown>;
  quote?: Record<string, unknown> | null;
}) {
  useQueryMock.mockImplementation((args: { queryKey: unknown[] }) => {
    const key = args.queryKey[0];
    if (key === REVNET_POSITION_QUERY_KEY) return { data: context };
    if (key === REVNET_CASH_OUT_QUOTE_QUERY_KEY) return { data: quote };
    return { data: undefined };
  });
}

function getQueryCall(key: string) {
  const call = useQueryMock.mock.calls
    .map(([args]) => args as { queryKey: unknown[] })
    .find((args) => args.queryKey[0] === key);
  expect(call).toBeDefined();
  return call as {
    enabled: boolean;
    queryFn: () => Promise<unknown>;
    queryKey: unknown[];
  };
}

describe("useRevnetPosition", () => {
  beforeEach(() => {
    useAccountMock.mockReset();
    usePublicClientMock.mockReset();
    useQueryMock.mockReset();
    getRevnetCashOutContextMock.mockReset();
    quoteRevnetCashOutMock.mockReset();
  });

  it("returns formatted data when the wire context and quote are available", () => {
    const context = {
      projectId: 138n,
      account: "0x" + "1".repeat(40),
      token: {
        address: "0x" + "3".repeat(40),
        symbol: "COBUILD",
        decimals: 6,
        balance: 123456n,
      },
      selectedAccountingContext: {
        token: contracts.USDCBase,
        decimals: 6,
        currency: 1,
      },
      quoteTerminal: "0x" + "4".repeat(40),
      quoteAccountingContext: {
        token: contracts.USDCBase,
        decimals: 6,
        currency: 1,
      },
      terminal: "0x" + "4".repeat(40),
      permissionsAddress: "0x" + "5".repeat(40),
      revLoansAddress: "0x" + "6".repeat(40),
    };
    const quote = {
      netReclaimAmount: 975n,
    };

    useAccountMock.mockReturnValue({ address: "0x" + "1".repeat(40) });
    usePublicClientMock.mockReturnValue({ readContract: vi.fn() });
    mockQueryData({ context, quote });

    const { result } = renderHook(() => useRevnetPosition());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.tokenAddress).toBe("0x" + "3".repeat(40));
    expect(result.current.tokenSymbol).toBe("COBUILD");
    expect(result.current.tokenDecimals).toBe(6);
    expect(result.current.formattedBalance).toBe("0.123456");
    expect(result.current.baseTokenSymbol).toBe("USDC");
    expect(result.current.formattedCashOutValue).toBe("0.000975");
  });

  it("falls back when disconnected or the wire context has not loaded", () => {
    useAccountMock.mockReturnValue({ address: undefined });
    usePublicClientMock.mockReturnValue(null);
    mockQueryData({ context: undefined, quote: undefined });

    const { result } = renderHook(() => useRevnetPosition());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.tokenAddress).toBeUndefined();
    expect(result.current.tokenSymbol).toBe("Token");
    expect(result.current.baseTokenSymbol).toBe("Token");
    expect(result.current.formattedCashOutValue).toBe("0");
  });

  it("delegates position and quote reads to the canonical wire helpers", async () => {
    const publicClient = { readContract: vi.fn() };
    const context = {
      projectId: 138n,
      account: "0x" + "1".repeat(40),
      token: {
        address: "0x" + "3".repeat(40),
        symbol: "COBUILD",
        decimals: 6,
        balance: 123456n,
      },
      selectedAccountingContext: {
        token: WETH_ADDRESS,
        decimals: 18,
        currency: 1,
      },
      quoteTerminal: "0x" + "4".repeat(40),
      quoteAccountingContext: {
        token: WETH_ADDRESS,
        decimals: 18,
        currency: 1,
      },
      terminal: "0x" + "4".repeat(40),
      permissionsAddress: "0x" + "5".repeat(40),
      revLoansAddress: "0x" + "6".repeat(40),
    };
    const quote = {
      netReclaimAmount: 777n,
    };

    useAccountMock.mockReturnValue({ address: "0x" + "1".repeat(40) });
    usePublicClientMock.mockReturnValue(publicClient);
    mockQueryData({ context, quote: undefined });
    getRevnetCashOutContextMock.mockResolvedValue(context);
    quoteRevnetCashOutMock.mockResolvedValue(quote);

    renderHook(() => useRevnetPosition());

    const contextCall = getQueryCall(REVNET_POSITION_QUERY_KEY);
    expect(contextCall.enabled).toBe(true);
    await expect(contextCall.queryFn()).resolves.toEqual(context);
    expect(getRevnetCashOutContextMock).toHaveBeenCalledWith(publicClient, {
      account: "0x" + "1".repeat(40),
      preferredBaseToken: contracts.USDCBase,
    });

    const quoteCall = getQueryCall(REVNET_CASH_OUT_QUOTE_QUERY_KEY);
    expect(quoteCall.enabled).toBe(true);
    await expect(quoteCall.queryFn()).resolves.toEqual(quote);
    expect(quoteRevnetCashOutMock).toHaveBeenCalledWith(publicClient, {
      projectId: 138n,
      rawCashOutCount: 123456n,
      terminal: "0x" + "4".repeat(40),
      accountingContext: {
        token: WETH_ADDRESS,
        decimals: 18,
        currency: 1,
      },
    });
  });

  it("preserves the position snapshot when the quote read fails", async () => {
    const context = {
      projectId: 138n,
      account: "0x" + "1".repeat(40),
      token: {
        address: "0x" + "3".repeat(40),
        symbol: "COBUILD",
        decimals: 6,
        balance: 123456n,
      },
      selectedAccountingContext: {
        token: contracts.USDCBase,
        decimals: 6,
        currency: 1,
      },
      quoteTerminal: "0x" + "4".repeat(40),
      quoteAccountingContext: {
        token: contracts.USDCBase,
        decimals: 6,
        currency: 1,
      },
      terminal: "0x" + "4".repeat(40),
      permissionsAddress: "0x" + "5".repeat(40),
      revLoansAddress: "0x" + "6".repeat(40),
    };
    const publicClient = { readContract: vi.fn() };

    useAccountMock.mockReturnValue({ address: "0x" + "1".repeat(40) });
    usePublicClientMock.mockReturnValue(publicClient);
    mockQueryData({ context, quote: undefined });
    quoteRevnetCashOutMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useRevnetPosition());

    expect(result.current.tokenAddress).toBe("0x" + "3".repeat(40));
    expect(result.current.formattedBalance).toBe("0.123456");
    expect(result.current.formattedCashOutValue).toBe("0");

    const quoteCall = getQueryCall(REVNET_CASH_OUT_QUOTE_QUERY_KEY);
    await expect(quoteCall.queryFn()).resolves.toBeNull();
  });

  it("skips the quote read when the position has no token balance", async () => {
    const context = {
      projectId: 138n,
      account: "0x" + "1".repeat(40),
      token: {
        address: "0x" + "3".repeat(40),
        symbol: "COBUILD",
        decimals: 6,
        balance: 0n,
      },
      selectedAccountingContext: {
        token: WETH_ADDRESS,
        decimals: 18,
        currency: 1,
      },
      quoteTerminal: "0x" + "4".repeat(40),
      quoteAccountingContext: {
        token: WETH_ADDRESS,
        decimals: 18,
        currency: 1,
      },
      terminal: "0x" + "4".repeat(40),
      permissionsAddress: "0x" + "5".repeat(40),
      revLoansAddress: "0x" + "6".repeat(40),
    };

    useAccountMock.mockReturnValue({ address: "0x" + "1".repeat(40) });
    usePublicClientMock.mockReturnValue({ readContract: vi.fn() });
    mockQueryData({ context, quote: undefined });

    renderHook(() => useRevnetPosition());

    const quoteCall = getQueryCall(REVNET_CASH_OUT_QUOTE_QUERY_KEY);
    expect(quoteCall.enabled).toBe(false);
    await expect(quoteCall.queryFn()).resolves.toBeNull();
    expect(quoteRevnetCashOutMock).not.toHaveBeenCalled();
  });

  it("skips the quote read when the cash-out context is incomplete", async () => {
    const context = {
      projectId: 138n,
      account: "0x" + "1".repeat(40),
      token: {
        address: "0x" + "3".repeat(40),
        symbol: "COBUILD",
        decimals: 6,
        balance: 123456n,
      },
      selectedAccountingContext: {
        token: WETH_ADDRESS,
        decimals: 18,
        currency: 1,
      },
      quoteTerminal: null,
      quoteAccountingContext: null,
      terminal: "0x" + "4".repeat(40),
      permissionsAddress: "0x" + "5".repeat(40),
      revLoansAddress: "0x" + "6".repeat(40),
    };

    useAccountMock.mockReturnValue({ address: "0x" + "1".repeat(40) });
    usePublicClientMock.mockReturnValue({ readContract: vi.fn() });
    mockQueryData({ context, quote: undefined });

    renderHook(() => useRevnetPosition());

    const quoteCall = getQueryCall(REVNET_CASH_OUT_QUOTE_QUERY_KEY);
    expect(quoteCall.enabled).toBe(false);
    await expect(quoteCall.queryFn()).resolves.toBeNull();
    expect(quoteRevnetCashOutMock).not.toHaveBeenCalled();
  });
});
