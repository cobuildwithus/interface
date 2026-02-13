/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const useRevnetDataMock = vi.fn();
const getTokenQuoteMock = vi.fn();
const formatTokenAmountMock = vi.fn();

vi.mock("@/lib/hooks/use-revnet-data", () => ({
  useRevnetData: (projectId?: bigint) => useRevnetDataMock(projectId),
}));

vi.mock("@/lib/domains/token/onchain/quote", () => ({
  getTokenQuote: (...args: Parameters<typeof getTokenQuoteMock>) => getTokenQuoteMock(...args),
  formatTokenAmount: (...args: Parameters<typeof formatTokenAmountMock>) =>
    formatTokenAmountMock(...args),
}));

import { usePaymentQuote } from "@/lib/hooks/use-payment-quote";

describe("usePaymentQuote", () => {
  beforeEach(() => {
    useRevnetDataMock.mockReset();
    getTokenQuoteMock.mockReset();
    formatTokenAmountMock.mockReset();
  });

  it("returns zeroed formatted quote when no data", () => {
    useRevnetDataMock.mockReturnValue({ data: null, isLoading: false, error: null });
    const { result } = renderHook(() => usePaymentQuote("0.1"));
    expect(result.current.formattedQuote).toEqual({
      payerTokens: "0",
      reservedTokens: "0",
      totalTokens: "0",
    });
  });

  it("computes quote when data + amount present", () => {
    useRevnetDataMock.mockReturnValue({
      data: { weight: "100", reservedPercent: 20, isPaused: false },
      isLoading: false,
      error: null,
    });
    getTokenQuoteMock.mockReturnValue({
      payerTokens: 1n,
      reservedTokens: 2n,
      totalTokens: 3n,
    });
    formatTokenAmountMock.mockImplementation((value: bigint) => value.toString());

    const { result } = renderHook(() => usePaymentQuote("0.5"));
    expect(result.current.quote).toEqual({
      payerTokens: 1n,
      reservedTokens: 2n,
      totalTokens: 3n,
    });
    expect(result.current.formattedQuote.totalTokens).toBe("3");
  });

  it("returns null quote on parse error", () => {
    useRevnetDataMock.mockReturnValue({
      data: { weight: "100", reservedPercent: 20, isPaused: false },
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => usePaymentQuote("not-a-number"));
    expect(result.current.quote).toBeNull();
  });
});
