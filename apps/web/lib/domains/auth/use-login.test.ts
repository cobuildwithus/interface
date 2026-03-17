/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routerRefresh = vi.hoisted(() => vi.fn());
const usePrivyMock = vi.hoisted(() => vi.fn());
const useAccountMock = vi.hoisted(() => vi.fn());
const removeQueriesMock = vi.hoisted(() => vi.fn());
const useUserContextMock = vi.hoisted(() => vi.fn());
const refreshUserMock = vi.hoisted(() => vi.fn());
const privyLoginMock = vi.hoisted(() => vi.fn());
const privyLogoutMock = vi.hoisted(() => vi.fn());
const privyConnectWalletMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));

vi.mock("wagmi", () => ({
  useAccount: () => useAccountMock(),
}));

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => usePrivyMock(),
  useUser: () => ({ user: null, refreshUser: refreshUserMock }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ removeQueries: removeQueriesMock }),
}));
vi.mock("@/lib/domains/auth/user-context", () => ({
  useUserContext: () => useUserContextMock(),
}));

import { useLogin } from "./use-login";

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

function mockPrivyState(
  overrides: Partial<{
    ready: boolean;
    authenticated: boolean;
  }> = {}
) {
  usePrivyMock.mockReturnValue({
    ready: true,
    authenticated: false,
    user: null,
    login: privyLoginMock,
    logout: privyLogoutMock,
    connectWallet: privyConnectWalletMock,
    ...overrides,
  });
}

describe("useLogin", () => {
  beforeEach(() => {
    routerRefresh.mockReset();
    usePrivyMock.mockReset();
    useAccountMock.mockReset();
    removeQueriesMock.mockReset();
    useUserContextMock.mockReset();
    refreshUserMock.mockReset();
    privyLoginMock.mockReset();
    privyLogoutMock.mockReset();
    privyConnectWalletMock.mockReset();

    mockPrivyState();
    useAccountMock.mockReturnValue({ isConnected: false, address: null });
    useUserContextMock.mockReturnValue(null);
    refreshUserMock.mockResolvedValue(undefined);
  });

  it("returns auth and wallet state from dependencies", () => {
    mockPrivyState({ ready: false, authenticated: true });
    useAccountMock.mockReturnValue({
      isConnected: true,
      address: "0x" + "a".repeat(40),
    });

    const { result } = renderHook(() => useLogin());

    expect(result.current.ready).toBe(false);
    expect(result.current.authenticated).toBe(true);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe("0x" + "a".repeat(40));
  });

  it("calls refreshUser and router refresh when already authenticated", async () => {
    mockPrivyState({ authenticated: true });
    refreshUserMock.mockResolvedValue({ id: "user-1" });

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      result.current.login();
      await flushPromises();
    });

    expect(refreshUserMock).toHaveBeenCalled();
    expect(routerRefresh).toHaveBeenCalled();
    expect(privyLogoutMock).not.toHaveBeenCalled();
    expect(privyLoginMock).not.toHaveBeenCalled();
  });

  it("sets reconnect fallback error when refresh fails and logout throws non-Error", async () => {
    mockPrivyState({ authenticated: true });
    refreshUserMock.mockRejectedValue(new Error("session stale"));
    privyLogoutMock.mockRejectedValue("logout failed");

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      result.current.login();
      await flushPromises();
    });

    expect(result.current.error).toBe("Failed to reconnect");
  });

  it("sets fallback error when logout rejects with non-Error", async () => {
    privyLogoutMock.mockRejectedValue("cannot logout");

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.error).toBe("Failed to log out");
  });

  it("sets fallback error when switchWallet cannot log out", async () => {
    privyLogoutMock.mockRejectedValue("cannot switch");

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.switchWallet();
    });

    expect(result.current.error).toBe("Failed to switch wallet");
    expect(privyLoginMock).not.toHaveBeenCalled();
  });

  it("uses fallback error when connect wallet throws a non-Error value", () => {
    privyConnectWalletMock.mockImplementation(() => {
      throw "";
    });

    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.connectWallet();
    });

    expect(result.current.error).toBe("Failed to connect wallet");
  });

  it("uses fresh login flow instead of wallet linking when already authenticated", async () => {
    mockPrivyState({ authenticated: true });

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      result.current.connectWallet();
      await flushPromises();
    });

    expect(privyConnectWalletMock).not.toHaveBeenCalled();
    expect(privyLogoutMock).toHaveBeenCalled();
    expect(privyLoginMock).toHaveBeenCalled();
  });

  it("surfaces logout errors when authenticated connectWallet forces relogin", async () => {
    mockPrivyState({ authenticated: true });
    privyLogoutMock.mockRejectedValue(new Error("logout failed"));

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      result.current.connectWallet();
      await flushPromises();
    });

    expect(privyConnectWalletMock).not.toHaveBeenCalled();
    expect(privyLoginMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe("logout failed");
  });

  it("clears auth-scoped queries using the session identity instead of a mismatched wallet address", async () => {
    useAccountMock.mockReturnValue({ isConnected: true, address: "0x" + "b".repeat(40) });
    useUserContextMock.mockReturnValue({
      address: "0x" + "a".repeat(40),
      farcaster: null,
      twitter: null,
    });
    privyLogoutMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.logout();
    });

    expect(removeQueriesMock).toHaveBeenCalledWith({
      queryKey: ["linked-accounts", "address:0x" + "a".repeat(40)],
      exact: true,
    });
    expect(removeQueriesMock).toHaveBeenCalledWith({
      queryKey: ["farcaster-signer", "address:0x" + "a".repeat(40)],
      exact: true,
    });
    expect(removeQueriesMock).toHaveBeenCalledWith({
      queryKey: ["profile", "0x" + "a".repeat(40)],
      exact: true,
    });
  });

  it("refreshes the router when auth state changes after mount", () => {
    let authenticated = false;
    usePrivyMock.mockImplementation(() => ({
      ready: true,
      authenticated,
      user: null,
      login: privyLoginMock,
      logout: privyLogoutMock,
      connectWallet: privyConnectWalletMock,
    }));

    const { rerender } = renderHook(() => useLogin());

    authenticated = true;
    rerender();

    expect(routerRefresh).toHaveBeenCalledTimes(1);
  });
});
