/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import type { UserResponse } from "@/lib/domains/auth/user-response-types";

const useSWRMock = vi.hoisted(() => vi.fn());
vi.mock("swr", () => ({ default: useSWRMock }));

import { useAutoSubmitPostDialog } from "@/lib/hooks/use-auto-submit-post-dialog";
import { useNow } from "@/lib/hooks/use-now";
import { useUser } from "@/lib/hooks/use-user";
import { useEthPrice } from "@/lib/hooks/use-eth-price";
import { useRevnetData } from "@/lib/hooks/use-revnet-data";
import { UserProvider, useUserContext } from "@/lib/domains/auth/user-context";

beforeEach(() => {
  useSWRMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useAutoSubmitPostDialog", () => {
  it("auto-submits once when ready and resets when closed", async () => {
    const onSubmit = vi.fn();

    const { rerender } = renderHook((props) => useAutoSubmitPostDialog(props), {
      initialProps: {
        open: false,
        input: "",
        ineligible: false,
        isBusy: false,
        verificationStatus: "idle" as const,
        canSubmit: true,
        onSubmit,
      },
    });

    rerender({
      open: true,
      input: "hash",
      ineligible: false,
      isBusy: false,
      verificationStatus: "idle",
      canSubmit: true,
      onSubmit,
    });

    await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    // closing resets latch
    rerender({
      open: false,
      input: "",
      ineligible: false,
      isBusy: false,
      verificationStatus: "idle",
      canSubmit: true,
      onSubmit,
    });

    rerender({
      open: true,
      input: "hash",
      ineligible: false,
      isBusy: false,
      verificationStatus: "idle",
      canSubmit: true,
      onSubmit,
    });

    await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});

describe("useNow", () => {
  it("ticks on interval and reacts to visibility", () => {
    vi.useFakeTimers();
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(2000).mockReturnValueOnce(3000);

    const { result, unmount } = renderHook(() => useNow({ intervalMs: 100 }));
    const first = result.current;
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).not.toBe(first);

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(100);
    });

    unmount();
  });
});

describe("useUser", () => {
  it("throws without provider", () => {
    expect(() => renderHook(() => useUser())).toThrow("useUser must be used within UserProvider");
  });

  it("prefers user context and skips loading state", () => {
    const user: UserResponse = {
      address: `0x${"c".repeat(40)}`,
      farcaster: { fid: 42, username: "ctx", displayName: null, pfp: null, neynarScore: null },
      twitter: null,
    };

    const { result } = renderHook(() => useUser(), { wrapper: withUserProvider(user) });
    expect(result.current.address).toBe(user.address);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });
});

describe("user-context", () => {
  it("returns provided user context", () => {
    const user: UserResponse = { address: null, farcaster: null, twitter: null };
    const { result } = renderHook(() => useUserContext(), { wrapper: withUserProvider(user) });
    expect(result.current).toEqual(user);
  });
});

function withUserProvider(user: UserResponse) {
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(UserProvider, { value: user }, children);
  Wrapper.displayName = "UserProviderWrapper";
  return Wrapper;
}

describe("useEthPrice", () => {
  it("uses data and converts USD to ETH", async () => {
    useSWRMock.mockReturnValue({ data: { priceUsdc: 2000 }, isLoading: false });
    const { result } = renderHook(() => useEthPrice());
    expect(result.current.ethPriceUsdc).toBe(2000);
    expect(result.current.usdToEth(1)).toBe("0.00050000");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: () => ({ priceUsdc: 1234 }) });
    vi.stubGlobal("fetch", fetchMock);
    const [, fetcher] = useSWRMock.mock.calls[0];
    await fetcher();
    await fetcher();
  });
});

describe("useRevnetData", () => {
  it("returns data + fetcher", async () => {
    useSWRMock.mockReturnValue({ data: { weight: "1" }, error: null, isLoading: false });
    const { result } = renderHook(() => useRevnetData());
    expect(result.current.data?.weight).toBe("1");

    const fetchMock = vi.fn().mockResolvedValue({ json: () => ({ weight: "2" }) });
    vi.stubGlobal("fetch", fetchMock);
    const [, fetcher] = useSWRMock.mock.calls[0];
    await fetcher("/api/revnet");
  });

  it("builds a project-specific key when projectId is provided", () => {
    useSWRMock.mockReturnValue({ data: null, error: null, isLoading: false });
    renderHook(() => useRevnetData(123n));
    const [key] = useSWRMock.mock.calls[0];
    expect(key).toBe("/api/revnet?projectId=123");
  });
});
