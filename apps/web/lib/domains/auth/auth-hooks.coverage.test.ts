/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const routerRefresh = vi.hoisted(() => vi.fn());
const privyLoginMock = vi.hoisted(() => vi.fn());
const privyConnectWalletMock = vi.hoisted(() => vi.fn());
const privyLogoutMock = vi.hoisted(() => vi.fn());
const usePrivyMock = vi.hoisted(() => vi.fn());
const usePrivyLinkAccountMock = vi.hoisted(() => vi.fn());
const useIdentityTokenMock = vi.hoisted(() => vi.fn());
const refreshUserMock = vi.hoisted(() => vi.fn());
const useAccountMock = vi.hoisted(() => vi.fn());
const useProfileMock = vi.hoisted(() => vi.fn());
const useLinkedAccountsMock = vi.hoisted(() => vi.fn());
const syncLinkedAccountsMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({ error: vi.fn() }));

type PrivyCallbackOptions = {
  onError?: (error?: Error | string) => void;
  onSuccess?: () => void;
};

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: routerRefresh }) }));
vi.mock("@privy-io/react-auth", () => ({
  useLogin: (opts: PrivyCallbackOptions) => ({ login: () => privyLoginMock(opts) }),
  useLogout: (opts: PrivyCallbackOptions) => ({ logout: () => privyLogoutMock(opts) }),
  useConnectWallet: (opts: PrivyCallbackOptions) => ({
    connectWallet: () => privyConnectWalletMock(opts),
  }),
  usePrivy: () => usePrivyMock(),
  useUser: () => ({ user: null, refreshUser: refreshUserMock }),
  useLinkAccount: (opts: PrivyCallbackOptions) => usePrivyLinkAccountMock(opts),
  useIdentityToken: () => useIdentityTokenMock(),
}));
vi.mock("wagmi", () => ({ useAccount: () => useAccountMock() }));
vi.mock("@/lib/hooks/use-profile", () => ({ useProfile: (addr: string) => useProfileMock(addr) }));
vi.mock("@/lib/hooks/use-linked-accounts", () => ({
  useLinkedAccounts: () => useLinkedAccountsMock(),
}));
vi.mock("@/lib/domains/auth/linked-accounts/sync-linked-accounts", () => ({
  syncLinkedAccountsFromSession: (...args: Parameters<typeof syncLinkedAccountsMock>) =>
    syncLinkedAccountsMock(...args),
}));
vi.mock("sonner", () => ({ toast: toastMock }));

import { useLogin } from "@/lib/domains/auth/use-login";
import { useLinkAccount } from "@/lib/domains/auth/use-link-account";
import { useActiveIdentityToken } from "@/lib/domains/auth/use-active-identity-token";

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("useLogin", () => {
  beforeEach(() => {
    privyLoginMock.mockReset();
    privyConnectWalletMock.mockReset();
    privyLogoutMock.mockReset();
    refreshUserMock.mockReset();
    usePrivyMock.mockReturnValue({ ready: true, authenticated: false });
    useAccountMock.mockReturnValue({ isConnected: false, address: null });
  });

  it("sets error on login/connect errors", () => {
    privyLoginMock.mockImplementation(() => {
      throw new Error("boom");
    });
    privyConnectWalletMock.mockImplementation(() => {
      throw new Error("wallet");
    });

    const { result } = renderHook(() => useLogin());

    act(() => result.current.login());
    expect(result.current.error).toBe("boom");

    act(() => result.current.connectWallet());
    expect(result.current.error).toBe("wallet");

    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it("captures privy onError callbacks", () => {
    privyLoginMock.mockImplementation((opts: PrivyCallbackOptions) => {
      opts.onError?.(new Error("login fail"));
    });
    privyConnectWalletMock.mockImplementation((opts: PrivyCallbackOptions) => {
      opts.onError?.(new Error("wallet fail"));
    });

    const { result } = renderHook(() => useLogin());

    act(() => result.current.login());
    expect(result.current.error).toBe("Error: login fail");

    act(() => result.current.connectWallet());
    expect(result.current.error).toBe("Error: wallet fail");
  });

  it("falls back on non-Error throws and empty onError messages", () => {
    privyLoginMock.mockImplementation(() => {
      throw "nope";
    });
    privyConnectWalletMock.mockImplementation(() => {
      throw 123;
    });

    const { result } = renderHook(() => useLogin());

    act(() => result.current.login());
    expect(result.current.error).toBe("Failed to connect");

    act(() => result.current.connectWallet());
    expect(result.current.error).toBe("Failed to connect wallet");

    privyLoginMock.mockImplementation((opts: PrivyCallbackOptions) => {
      opts.onError?.("");
    });
    act(() => result.current.login());
    expect(result.current.error).toBe("Failed to connect");
  });

  it("switchWallet logs out before triggering login", async () => {
    privyLogoutMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.switchWallet();
    });

    expect(privyLogoutMock).toHaveBeenCalled();
    expect(privyLoginMock).toHaveBeenCalled();
  });

  it("refreshes the user when already authenticated", async () => {
    usePrivyMock.mockReturnValue({ ready: true, authenticated: true });
    refreshUserMock.mockResolvedValue({ id: "user-1" });

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      result.current.login();
    });

    expect(refreshUserMock).toHaveBeenCalled();
    expect(privyLoginMock).not.toHaveBeenCalled();
  });

  it("falls back to logout+login when refresh fails", async () => {
    usePrivyMock.mockReturnValue({ ready: true, authenticated: true });
    refreshUserMock.mockRejectedValue(new Error("expired"));
    privyLogoutMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      result.current.login();
      await flushPromises();
    });

    expect(privyLogoutMock).toHaveBeenCalled();
    expect(privyLoginMock).toHaveBeenCalled();
  });

  it("surfaces errors when refresh and logout fail", async () => {
    usePrivyMock.mockReturnValue({ ready: true, authenticated: true });
    refreshUserMock.mockRejectedValue(new Error("expired"));
    privyLogoutMock.mockRejectedValue(new Error("logout failed"));

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      result.current.login();
      await flushPromises();
    });

    expect(result.current.error).toBe("logout failed");
  });
});

describe("useLinkAccount", () => {
  beforeEach(() => {
    usePrivyLinkAccountMock.mockReset();
    usePrivyMock.mockReturnValue({
      user: {
        farcaster: { fid: 1, username: "alice", displayName: "Alice" },
        twitter: { username: "alice_x", name: "Alice X" },
      },
    });
    useAccountMock.mockReturnValue({ address: "0x" + "a".repeat(40) });
    useProfileMock.mockReturnValue({ data: null });
    useLinkedAccountsMock.mockReturnValue({
      data: { address: "0x" + "a".repeat(40), accounts: [] },
      isLoading: false,
      mutate: vi.fn(),
    });
    syncLinkedAccountsMock.mockResolvedValue({ ok: true, updated: 0 });
    toastMock.error.mockReset();
  });

  it("links farcaster successfully", async () => {
    const linkFarcaster = vi.fn().mockResolvedValue(undefined);
    const linkTwitter = vi.fn().mockResolvedValue(undefined);
    usePrivyLinkAccountMock.mockReturnValue({ linkFarcaster, linkTwitter });

    const { result } = renderHook(() => useLinkAccount());

    await act(async () => {
      await result.current.linkFarcaster();
    });

    expect(linkFarcaster).toHaveBeenCalled();
  });

  it("captures errors for linkTwitter", async () => {
    const linkFarcaster = vi.fn();
    const linkTwitter = vi.fn().mockRejectedValue(new Error("client_error: already linked"));
    usePrivyLinkAccountMock.mockReturnValue({ linkFarcaster, linkTwitter });

    const { result } = renderHook(() => useLinkAccount());

    await act(async () => {
      await result.current.linkTwitter();
    });

    expect(toastMock.error).toHaveBeenCalled();
    expect(result.current.error).toBe("client_error: already linked");
  });

  it("merges linked accounts", () => {
    usePrivyLinkAccountMock.mockReturnValue({ linkFarcaster: vi.fn(), linkTwitter: vi.fn() });

    const { result } = renderHook(() => useLinkAccount());
    expect(result.current.linkedAccounts.farcaster?.fid).toBe(1);
    expect(result.current.linkedAccounts.twitter?.username).toBe("alice_x");
    expect(result.current.isLinked("farcaster")).toBe(true);
    expect(result.current.isLinked("twitter")).toBe(true);
  });

  it("uses profile fallback and clears linking state on success", async () => {
    const linkFarcaster = vi.fn().mockResolvedValue(undefined);
    const linkTwitter = vi.fn().mockResolvedValue(undefined);
    let linkOpts: PrivyCallbackOptions | null = null;
    usePrivyLinkAccountMock.mockImplementation((opts: PrivyCallbackOptions) => {
      linkOpts = opts;
      return { linkFarcaster, linkTwitter };
    });
    usePrivyMock.mockReturnValue({ user: { farcaster: null, twitter: null } });
    useProfileMock.mockReturnValue({ data: { farcaster: { fid: 3, name: "profile" } } });

    const { result } = renderHook(() => useLinkAccount());
    expect(result.current.linkedAccounts.farcaster?.fid).toBe(3);

    await act(async () => {
      await result.current.linkFarcaster();
    });
    expect(result.current.isLinkingType("farcaster")).toBe(true);

    expect(linkOpts).not.toBeNull();
    act(() => {
      linkOpts?.onSuccess?.();
    });
    expect(result.current.isLinking).toBe(false);
    expect(result.current.error).toBeNull();
    expect(routerRefresh).toHaveBeenCalled();
  });

  it("clears linking state on privy onError", async () => {
    const linkFarcaster = vi.fn().mockResolvedValue(undefined);
    const linkTwitter = vi.fn().mockResolvedValue(undefined);
    let linkOpts: PrivyCallbackOptions | null = null;
    usePrivyLinkAccountMock.mockImplementation((opts: PrivyCallbackOptions) => {
      linkOpts = opts;
      return { linkFarcaster, linkTwitter };
    });

    const { result } = renderHook(() => useLinkAccount());

    await act(async () => {
      await result.current.linkFarcaster();
    });
    expect(result.current.isLinking).toBe(true);

    expect(linkOpts).not.toBeNull();
    act(() => {
      linkOpts?.onError?.();
    });
    expect(result.current.isLinking).toBe(false);
  });

  it("falls back to generic error messaging", async () => {
    const linkFarcaster = vi.fn().mockRejectedValue("");
    const linkTwitter = vi.fn();
    usePrivyLinkAccountMock.mockReturnValue({ linkFarcaster, linkTwitter });

    const { result } = renderHook(() => useLinkAccount());

    await act(async () => {
      await result.current.linkFarcaster();
    });

    expect(toastMock.error).toHaveBeenCalledWith("Failed to link account");
    expect(result.current.error).toBe("Failed to link account");
  });

  it("prefers db linked accounts when available", () => {
    useLinkedAccountsMock.mockReturnValueOnce({
      data: {
        address: "0x" + "a".repeat(40),
        accounts: [
          {
            platform: "farcaster",
            platformId: "42",
            username: "db_fc",
            displayName: "DB FC",
            avatarUrl: null,
            source: "privy",
            canPost: false,
            updatedAt: "now",
          },
          {
            platform: "x",
            platformId: "123",
            username: "db_x",
            displayName: "DB X",
            avatarUrl: null,
            source: "privy",
            canPost: false,
            updatedAt: "now",
          },
        ],
      },
      isLoading: false,
      mutate: vi.fn(),
    });
    usePrivyLinkAccountMock.mockReturnValue({ linkFarcaster: vi.fn(), linkTwitter: vi.fn() });

    const { result } = renderHook(() => useLinkAccount());

    expect(result.current.linkedAccounts.farcaster?.fid).toBe(42);
    expect(result.current.linkedAccounts.twitter?.username).toBe("db_x");
  });

  it("falls back when db farcaster fid is invalid", () => {
    useLinkedAccountsMock.mockReturnValueOnce({
      data: {
        address: "0x" + "a".repeat(40),
        accounts: [
          {
            platform: "farcaster",
            platformId: "not-a-number",
            username: "bad",
            displayName: "Bad",
            avatarUrl: null,
            source: "privy",
            canPost: false,
            updatedAt: "now",
          },
        ],
      },
      isLoading: false,
      mutate: vi.fn(),
    });
    usePrivyLinkAccountMock.mockReturnValue({ linkFarcaster: vi.fn(), linkTwitter: vi.fn() });

    const { result } = renderHook(() => useLinkAccount());

    expect(result.current.linkedAccounts.farcaster?.fid).toBe(1);
  });

  it("surfaces sync errors on privy success", async () => {
    const linkFarcaster = vi.fn().mockResolvedValue(undefined);
    const linkTwitter = vi.fn().mockResolvedValue(undefined);
    let linkOpts: PrivyCallbackOptions | null = null;
    usePrivyLinkAccountMock.mockImplementation((opts: PrivyCallbackOptions) => {
      linkOpts = opts;
      return { linkFarcaster, linkTwitter };
    });
    syncLinkedAccountsMock.mockRejectedValueOnce(new Error("boom"));

    renderHook(() => useLinkAccount());

    expect(linkOpts).not.toBeNull();
    act(() => {
      linkOpts?.onSuccess?.();
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(toastMock.error).toHaveBeenCalledWith("Failed to sync linked accounts.");
  });

  it("warns when syncing without a wallet", async () => {
    const linkFarcaster = vi.fn().mockResolvedValue(undefined);
    const linkTwitter = vi.fn().mockResolvedValue(undefined);
    let linkOpts: PrivyCallbackOptions | null = null;
    usePrivyLinkAccountMock.mockImplementation((opts: PrivyCallbackOptions) => {
      linkOpts = opts;
      return { linkFarcaster, linkTwitter };
    });
    syncLinkedAccountsMock.mockResolvedValueOnce({ ok: false, reason: "missing_address" });

    renderHook(() => useLinkAccount());

    expect(linkOpts).not.toBeNull();
    act(() => {
      linkOpts?.onSuccess?.();
    });

    await Promise.resolve();

    expect(toastMock.error).toHaveBeenCalledWith("Connect a wallet to save linked accounts.");
  });
});

describe("useActiveIdentityToken", () => {
  beforeEach(() => {
    useIdentityTokenMock.mockReturnValue({ identityToken: null });
  });

  it("prefers the live identity token", () => {
    useIdentityTokenMock.mockReturnValue({ identityToken: "live-token" });
    const { result } = renderHook(() => useActiveIdentityToken("fallback-token"));
    expect(result.current).toBe("live-token");
  });

  it("falls back to the provided token when live token is missing", () => {
    const { result } = renderHook(() => useActiveIdentityToken("fallback-token"));
    expect(result.current).toBe("fallback-token");
  });

  it("returns undefined when no token is available", () => {
    const { result } = renderHook(() => useActiveIdentityToken());
    expect(result.current).toBeUndefined();
  });
});
