/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

const useSWRMock = vi.hoisted(() => vi.fn());
vi.mock("swr", () => ({ default: useSWRMock }));

import { useOnrampStatus } from "@/lib/hooks/use-onramp-status";

const MAX_MS = 4 * 60 * 1000;

beforeEach(() => {
  useSWRMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useOnrampStatus", () => {
  it("maps success, failed, polling, and idle states", () => {
    useSWRMock.mockReturnValueOnce({
      data: {
        tx: { status: "ONRAMP_TRANSACTION_STATUS_SUCCESS", transaction_id: "1" },
      },
      error: undefined,
      isLoading: false,
      isValidating: false,
    });
    const { result, rerender } = renderHook(() => useOnrampStatus());
    expect(result.current.state).toBe("success");

    useSWRMock.mockReturnValueOnce({
      data: {
        tx: { status: "ONRAMP_TRANSACTION_STATUS_FAILED", transaction_id: "2" },
      },
      error: undefined,
      isLoading: false,
      isValidating: false,
    });
    rerender();
    expect(result.current.state).toBe("failed");

    useSWRMock.mockReturnValueOnce({
      data: null,
      error: undefined,
      isLoading: true,
      isValidating: true,
    });
    rerender();
    expect(result.current.state).toBe("polling");

    useSWRMock.mockReturnValueOnce({
      data: null,
      error: undefined,
      isLoading: false,
      isValidating: false,
    });
    rerender();
    expect(result.current.state).toBe("idle");
  });

  it("transitions to timeout after the max duration", () => {
    vi.useFakeTimers();
    useSWRMock.mockReturnValue({
      data: null,
      error: undefined,
      isLoading: true,
      isValidating: true,
    });

    const { result } = renderHook(() => useOnrampStatus());
    expect(result.current.state).toBe("polling");

    act(() => {
      vi.advanceTimersByTime(MAX_MS);
    });

    expect(result.current.state).toBe("timeout");
  });

  it("uses fetcher and refreshInterval helpers", async () => {
    vi.useFakeTimers();
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(0);

    useSWRMock.mockReturnValue({
      data: null,
      error: undefined,
      isLoading: true,
      isValidating: true,
    });

    const { result, rerender } = renderHook(() => useOnrampStatus());
    const [, fetcher, options] = useSWRMock.mock.calls[0];
    const refreshInterval = options?.refreshInterval as (
      latestData: { tx?: { status?: string; transaction_id?: string } } | undefined
    ) => number;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 401, ok: false })
      .mockResolvedValueOnce({ status: 500, ok: false })
      .mockResolvedValueOnce({ status: 200, ok: true, json: () => ({ tx: null }) });
    vi.stubGlobal("fetch", fetchMock);

    let unauthorizedError: Error | undefined;
    try {
      await fetcher();
    } catch (err) {
      unauthorizedError = err instanceof Error ? err : new Error(String(err));
    }

    await expect(fetcher()).rejects.toThrow("Status failed");
    await expect(fetcher()).resolves.toEqual({ tx: null });

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(
      refreshInterval({ tx: { status: "ONRAMP_TRANSACTION_STATUS_IN_PROGRESS" } })
    ).toBeGreaterThan(0);
    expect(refreshInterval({ tx: { status: "ONRAMP_TRANSACTION_STATUS_SUCCESS" } })).toBe(0);

    nowSpy.mockReturnValue(MAX_MS + 1);
    expect(refreshInterval({ tx: { status: "ONRAMP_TRANSACTION_STATUS_IN_PROGRESS" } })).toBe(0);
    nowSpy.mockReturnValue(0);

    useSWRMock.mockReturnValueOnce({
      data: null,
      error: unauthorizedError,
      isLoading: false,
      isValidating: false,
    });
    rerender();
    expect(result.current.state).toBe("unauthorized");
    await act(async () => {});
    expect(refreshInterval(undefined)).toBe(0);

    randomSpy.mockRestore();
  });
});
