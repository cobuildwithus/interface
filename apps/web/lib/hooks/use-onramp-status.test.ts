/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

const useQueryMock = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-query", () => ({
  useQuery: (args: Parameters<typeof useQueryMock>[0]) => useQueryMock(args),
}));

import { useOnrampStatus } from "@/lib/hooks/use-onramp-status";

const MAX_MS = 4 * 60 * 1000;

beforeEach(() => {
  useQueryMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useOnrampStatus", () => {
  it("maps success, failed, polling, and idle states", () => {
    useQueryMock.mockReturnValueOnce({
      data: {
        tx: { status: "ONRAMP_TRANSACTION_STATUS_SUCCESS", transaction_id: "1" },
      },
      error: undefined,
      isLoading: false,
      isFetching: false,
    });
    const { result, rerender } = renderHook(() => useOnrampStatus());
    expect(result.current.state).toBe("success");

    useQueryMock.mockReturnValueOnce({
      data: {
        tx: { status: "ONRAMP_TRANSACTION_STATUS_FAILED", transaction_id: "2" },
      },
      error: undefined,
      isLoading: false,
      isFetching: false,
    });
    rerender();
    expect(result.current.state).toBe("failed");

    useQueryMock.mockReturnValueOnce({
      data: null,
      error: undefined,
      isLoading: true,
      isFetching: true,
    });
    rerender();
    expect(result.current.state).toBe("polling");

    useQueryMock.mockReturnValueOnce({
      data: null,
      error: undefined,
      isLoading: false,
      isFetching: false,
    });
    rerender();
    expect(result.current.state).toBe("idle");
  });

  it("transitions to timeout after the max duration", () => {
    vi.useFakeTimers();
    useQueryMock.mockReturnValue({
      data: null,
      error: undefined,
      isLoading: true,
      isFetching: true,
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

    useQueryMock.mockReturnValue({
      data: null,
      error: undefined,
      isLoading: true,
      isFetching: true,
    });

    const { result, rerender } = renderHook(() => useOnrampStatus());
    const call = useQueryMock.mock.calls[0]?.[0];
    const refreshInterval = call.refetchInterval as (args: {
      state: {
        data?: { tx?: { status?: string; transaction_id?: string } };
        error?: unknown;
      };
    }) => number | false;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 401, ok: false })
      .mockResolvedValueOnce({ status: 500, ok: false })
      .mockResolvedValueOnce({ status: 200, ok: true, json: () => ({ tx: null }) });
    vi.stubGlobal("fetch", fetchMock);

    let unauthorizedError: Error | undefined;
    try {
      await call.queryFn();
    } catch (err) {
      unauthorizedError = err instanceof Error ? err : new Error(String(err));
    }

    await expect(call.queryFn()).rejects.toThrow("Status failed");
    await expect(call.queryFn()).resolves.toEqual({ tx: null });

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(
      refreshInterval({
        state: { data: { tx: { status: "ONRAMP_TRANSACTION_STATUS_IN_PROGRESS" } }, error: null },
      })
    ).toBeGreaterThan(0);
    expect(
      refreshInterval({
        state: { data: { tx: { status: "ONRAMP_TRANSACTION_STATUS_SUCCESS" } }, error: null },
      })
    ).toBe(false);

    nowSpy.mockReturnValue(MAX_MS + 1);
    expect(
      refreshInterval({
        state: { data: { tx: { status: "ONRAMP_TRANSACTION_STATUS_IN_PROGRESS" } }, error: null },
      })
    ).toBe(false);
    nowSpy.mockReturnValue(0);

    useQueryMock.mockReturnValueOnce({
      data: null,
      error: unauthorizedError,
      isLoading: false,
      isFetching: false,
    });
    rerender();
    expect(result.current.state).toBe("unauthorized");
    await act(async () => {});
    expect(refreshInterval({ state: { data: undefined, error: unauthorizedError } })).toBe(false);

    randomSpy.mockRestore();
  });
});
