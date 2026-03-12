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

type PrivyCallbackOptions = {
  onComplete?: () => void;
  onError?: (error?: unknown) => void;
  onSuccess?: () => void;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));

vi.mock("wagmi", () => ({
  useAccount: () => useAccountMock(),
}));

vi.mock("@privy-io/react-auth", () => ({
  useLogin: (opts: PrivyCallbackOptions) => ({ login: () => privyLoginMock(opts) }),
  useLogout: (opts: PrivyCallbackOptions) => ({ logout: () => privyLogoutMock(opts) }),
  useConnectWallet: (opts: PrivyCallbackOptions) => ({
    connectWallet: () => privyConnectWalletMock(opts),
  }),
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

    usePrivyMock.mockReturnValue({ ready: true, authenticated: false });
    useAccountMock.mockReturnValue({ isConnected: false, address: null });
    useUserContextMock.mockReturnValue(null);
    refreshUserMock.mockResolvedValue(undefined);
  });

  it("returns auth and wallet state from dependencies", () => {
    usePrivyMock.mockReturnValue({ ready: false, authenticated: true });
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
    usePrivyMock.mockReturnValue({ ready: true, authenticated: true });
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
    usePrivyMock.mockReturnValue({ ready: true, authenticated: true });
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

  it("uses callback fallback message when connect wallet onError receives empty string", () => {
    privyConnectWalletMock.mockImplementation((opts: PrivyCallbackOptions) => {
      opts.onError?.("");
    });

    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.connectWallet();
    });

    expect(result.current.error).toBe("Failed to connect wallet");
  });

  it("uses fresh login flow instead of wallet linking when already authenticated", async () => {
    usePrivyMock.mockReturnValue({ ready: true, authenticated: true });

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
    usePrivyMock.mockReturnValue({ ready: true, authenticated: true });
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
});
