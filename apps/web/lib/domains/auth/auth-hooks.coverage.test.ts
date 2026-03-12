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
const usePrivyUserMock = vi.hoisted(() => vi.fn());
const refreshUserMock = vi.hoisted(() => vi.fn());
const useAccountMock = vi.hoisted(() => vi.fn());
const useProfileMock = vi.hoisted(() => vi.fn());
const useLinkedAccountsMock = vi.hoisted(() => vi.fn());
const useUserContextMock = vi.hoisted(() => vi.fn());
const useQueryClientMock = vi.hoisted(() => vi.fn());
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
  useUser: () => ({ user: usePrivyUserMock(), refreshUser: refreshUserMock }),
  useLinkAccount: (opts: PrivyCallbackOptions) => usePrivyLinkAccountMock(opts),
  useIdentityToken: () => useIdentityTokenMock(),
}));
vi.mock("wagmi", () => ({ useAccount: () => useAccountMock() }));
vi.mock("@/lib/hooks/use-profile", () => ({ useProfile: (addr: string) => useProfileMock(addr) }));
vi.mock("@/lib/domains/auth/user-context", () => ({
  useUserContext: () => useUserContextMock(),
}));
vi.mock("@/lib/hooks/use-linked-accounts", () => ({
  useLinkedAccounts: () => useLinkedAccountsMock(),
  fetchLinkedAccounts: vi.fn().mockResolvedValue({
    address: "0x" + "a".repeat(40),
    accounts: [],
  }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => useQueryClientMock(),
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
    usePrivyUserMock.mockReset();
    usePrivyUserMock.mockReturnValue(null);
    useQueryClientMock.mockReset();
    useQueryClientMock.mockReturnValue({ removeQueries: vi.fn() });
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

  it("routes authenticated connectWallet through logout+login", async () => {
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

  it("switchWallet logs out before triggering login", async () => {
    privyLogoutMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.switchWallet();
    });

    expect(privyLogoutMock).toHaveBeenCalled();
    expect(privyLoginMock).toHaveBeenCalled();
  });

  it("clears auth-scoped queries after logout succeeds", async () => {
    const removeQueries = vi.fn();
    useQueryClientMock.mockReturnValue({ removeQueries });
    useAccountMock.mockReturnValue({ isConnected: true, address: "0x" + "a".repeat(40) });
    usePrivyUserMock.mockReturnValue({ farcaster: { fid: 7 } });
    privyLogoutMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.logout();
    });

    expect(removeQueries).toHaveBeenCalledTimes(3);
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: ["linked-accounts", "address:0x" + "a".repeat(40)],
      exact: true,
    });
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: ["farcaster-signer", "address:0x" + "a".repeat(40)],
      exact: true,
    });
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: ["profile", "0x" + "a".repeat(40)],
      exact: true,
    });
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
    routerRefresh.mockReset();
    usePrivyMock.mockReturnValue({
      user: {
        farcaster: { fid: 1, username: "alice", displayName: "Alice" },
        twitter: { username: "alice_x", name: "Alice X" },
      },
    });
    useAccountMock.mockReturnValue({ address: "0x" + "a".repeat(40) });
    useUserContextMock.mockReturnValue({
      address: "0x" + "a".repeat(40),
      farcaster: { fid: 1, username: "alice", displayName: "Alice" },
      twitter: { username: "alice_x", name: "Alice X" },
    });
    useProfileMock.mockReturnValue({ data: null });
    useLinkedAccountsMock.mockReturnValue({
      data: { address: "0x" + "a".repeat(40), accounts: [] },
      isLoading: false,
      mutate: vi.fn(),
    });
    useQueryClientMock.mockReturnValue({
      removeQueries: vi.fn(),
      fetchQuery: vi.fn().mockResolvedValue({ address: "0x" + "a".repeat(40), accounts: [] }),
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
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
    expect(result.current.linkedAccounts.farcaster?.source).toBe("session");
    expect(result.current.linkedAccounts.twitter?.username).toBe("alice_x");
    expect(result.current.linkedAccounts.twitter?.source).toBe("session");
    expect(result.current.isLinked("farcaster")).toBe(true);
    expect(result.current.isLinked("twitter")).toBe(true);
  });

  it("clears linking state on success and refreshes linked-account state", async () => {
    const linkFarcaster = vi.fn().mockResolvedValue(undefined);
    const linkTwitter = vi.fn().mockResolvedValue(undefined);
    let linkOpts: PrivyCallbackOptions | null = null;
    usePrivyLinkAccountMock.mockImplementation((opts: PrivyCallbackOptions) => {
      linkOpts = opts;
      return { linkFarcaster, linkTwitter };
    });
    usePrivyMock.mockReturnValue({ user: { farcaster: null, twitter: null } });

    const { result } = renderHook(() => useLinkAccount());
    expect(result.current.linkedAccounts.farcaster).toBeNull();

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
    await flushPromises();
    const queryClient = useQueryClientMock.mock.results.at(-1)?.value;
    if (!queryClient) {
      throw new Error("Expected query client mock");
    }
    expect(queryClient.fetchQuery).toHaveBeenCalled();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["profile", "0x" + "a".repeat(40)],
      exact: true,
    });
    expect(routerRefresh).not.toHaveBeenCalled();
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
    expect(result.current.linkedAccounts.farcaster?.source).toBe("linked");
    expect(result.current.linkedAccounts.twitter?.username).toBe("db_x");
    expect(result.current.linkedAccounts.twitter?.source).toBe("linked");
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

  it("does not invent linked-account state when the live session and db sources are empty", () => {
    usePrivyMock.mockReturnValue({ user: { farcaster: null, twitter: null } });
    useLinkedAccountsMock.mockReturnValue({
      data: { address: "0x" + "a".repeat(40), accounts: [] },
      isLoading: false,
      mutate: vi.fn(),
    });
    usePrivyLinkAccountMock.mockReturnValue({ linkFarcaster: vi.fn(), linkTwitter: vi.fn() });

    const { result } = renderHook(() =>
      useLinkAccount({
        initialLinkedAccountsResponse: {
          address: "0x" + "a".repeat(40),
          accounts: [],
        },
      })
    );

    expect(result.current.linkedAccounts.farcaster).toBeNull();
    expect(result.current.linkedAccounts.twitter).toBeNull();
  });

  it("preserves detected farcaster seed sources for farcaster-only hydration", () => {
    usePrivyMock.mockReturnValue({ user: { farcaster: null, twitter: null } });
    useAccountMock.mockReturnValue({ address: undefined });
    useUserContextMock.mockReturnValue({
      address: null,
      farcaster: { fid: 9, username: "seeded_fc", displayName: "Seeded FC" },
      twitter: null,
    });
    useLinkedAccountsMock.mockReturnValue({
      data: { address: null, accounts: [] },
      isLoading: false,
      mutate: vi.fn(),
    });
    usePrivyLinkAccountMock.mockReturnValue({ linkFarcaster: vi.fn(), linkTwitter: vi.fn() });

    const { result } = renderHook(() =>
      useLinkAccount({
        initialLinkedAccounts: {
          farcaster: {
            fid: 9,
            username: "seeded_fc",
            displayName: "Seeded FC",
            source: "detected",
          },
        },
        initialLinkedAccountsResponse: {
          address: null,
          accounts: [],
        },
      })
    );

    expect(result.current.linkedAccounts.farcaster?.source).toBe("detected");
    expect(result.current.isLinked("farcaster")).toBe(false);
  });

  it("ignores stale seeded linked-account state when the current identity does not match", () => {
    usePrivyMock.mockReturnValue({ user: { farcaster: null, twitter: null } });
    useAccountMock.mockReturnValue({ address: "0x" + "b".repeat(40) });
    useUserContextMock.mockReturnValue({
      address: "0x" + "b".repeat(40),
      farcaster: null,
      twitter: null,
    });
    useLinkedAccountsMock.mockReturnValue({
      data: { address: "0x" + "b".repeat(40), accounts: [] },
      isLoading: false,
      mutate: vi.fn(),
    });
    usePrivyLinkAccountMock.mockReturnValue({ linkFarcaster: vi.fn(), linkTwitter: vi.fn() });

    const { result } = renderHook(() =>
      useLinkAccount({
        initialLinkedAccounts: {
          farcaster: {
            fid: 9,
            username: "stale_fc",
            displayName: "Stale FC",
            source: "detected",
          },
        },
        initialLinkedAccountsResponse: {
          address: "0x" + "a".repeat(40),
          accounts: [],
        },
      })
    );

    expect(result.current.linkedAccounts.farcaster).toBeNull();
    expect(result.current.isLinked("farcaster")).toBe(false);
  });

  it("treats verified-address farcaster sessions as detected instead of linked", () => {
    usePrivyMock.mockReturnValue({
      user: {
        farcaster: { fid: 9, username: "verified_fc", displayName: "Verified FC" },
        twitter: null,
      },
    });
    useAccountMock.mockReturnValue({ address: undefined });
    useUserContextMock.mockReturnValue({
      address: null,
      farcaster: {
        fid: 9,
        username: "verified_fc",
        displayName: "Verified FC",
        source: "verified_address",
      },
      twitter: null,
    });
    useLinkedAccountsMock.mockReturnValue({
      data: { address: null, accounts: [] },
      isLoading: false,
      mutate: vi.fn(),
    });
    usePrivyLinkAccountMock.mockReturnValue({ linkFarcaster: vi.fn(), linkTwitter: vi.fn() });

    const { result } = renderHook(() => useLinkAccount());

    expect(result.current.linkedAccounts.farcaster?.source).toBe("detected");
    expect(result.current.isLinked("farcaster")).toBe(false);
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
