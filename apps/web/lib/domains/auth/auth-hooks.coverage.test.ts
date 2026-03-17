/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const routerRefresh = vi.hoisted(() => vi.fn());
const privyLoginMock = vi.hoisted(() => vi.fn());
const privyConnectWalletMock = vi.hoisted(() => vi.fn());
const privyLogoutMock = vi.hoisted(() => vi.fn());
const privyLinkFarcasterMock = vi.hoisted(() => vi.fn());
const privyLinkTwitterMock = vi.hoisted(() => vi.fn());
const usePrivyMock = vi.hoisted(() => vi.fn());
const useModalStatusMock = vi.hoisted(() => vi.fn());
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

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: routerRefresh }) }));
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => usePrivyMock(),
  useModalStatus: () => useModalStatusMock(),
  useUser: () => ({ user: usePrivyUserMock(), refreshUser: refreshUserMock }),
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
const PENDING_SOCIAL_LINK_STORAGE_KEY = "cobuild:pending-social-link";

function buildPrivyState(
  overrides: Partial<{
    ready: boolean;
    authenticated: boolean;
    user: {
      farcaster: { fid: number; username?: string | null; displayName?: string | null } | null;
      twitter: { username?: string | null; name?: string | null } | null;
    } | null;
  }> = {}
) {
  return {
    ready: true,
    authenticated: false,
    user: null,
    login: privyLoginMock,
    connectWallet: privyConnectWalletMock,
    logout: privyLogoutMock,
    linkFarcaster: privyLinkFarcasterMock,
    linkTwitter: privyLinkTwitterMock,
    ...overrides,
  };
}

describe("useLogin", () => {
  beforeEach(() => {
    routerRefresh.mockReset();
    privyLoginMock.mockReset();
    privyConnectWalletMock.mockReset();
    privyLogoutMock.mockReset();
    privyLinkFarcasterMock.mockReset();
    privyLinkTwitterMock.mockReset();
    refreshUserMock.mockReset();
    usePrivyUserMock.mockReset();
    usePrivyUserMock.mockReturnValue(null);
    useQueryClientMock.mockReset();
    useQueryClientMock.mockReturnValue({ removeQueries: vi.fn() });
    usePrivyMock.mockReturnValue(buildPrivyState());
    useAccountMock.mockReturnValue({ isConnected: false, address: null });
    useUserContextMock.mockReturnValue(null);
    refreshUserMock.mockResolvedValue(undefined);
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

  it("falls back on non-Error throws", () => {
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
  });

  it("routes authenticated connectWallet through logout+login", async () => {
    usePrivyMock.mockReturnValue(buildPrivyState({ authenticated: true }));

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
    usePrivyMock.mockReturnValue(buildPrivyState({ authenticated: true }));
    refreshUserMock.mockResolvedValue({ id: "user-1" });

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      result.current.login();
      await flushPromises();
    });

    expect(refreshUserMock).toHaveBeenCalled();
    expect(privyLoginMock).not.toHaveBeenCalled();
    expect(routerRefresh).toHaveBeenCalled();
  });

  it("falls back to logout+login when refresh fails", async () => {
    usePrivyMock.mockReturnValue(buildPrivyState({ authenticated: true }));
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
    usePrivyMock.mockReturnValue(buildPrivyState({ authenticated: true }));
    refreshUserMock.mockRejectedValue(new Error("expired"));
    privyLogoutMock.mockRejectedValue(new Error("logout failed"));

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      result.current.login();
      await flushPromises();
    });

    expect(result.current.error).toBe("logout failed");
  });

  it("refreshes the router when auth state changes after mount", () => {
    let authenticated = false;
    usePrivyMock.mockImplementation(() => buildPrivyState({ authenticated }));

    const { rerender } = renderHook(() => useLogin());

    authenticated = true;
    rerender();

    expect(routerRefresh).toHaveBeenCalledTimes(1);
  });
});

describe("useLinkAccount", () => {
  beforeEach(() => {
    routerRefresh.mockReset();
    privyLinkFarcasterMock.mockReset();
    privyLinkTwitterMock.mockReset();
    usePrivyMock.mockReset();
    useModalStatusMock.mockReset();
    useAccountMock.mockReset();
    useUserContextMock.mockReset();
    useProfileMock.mockReset();
    useLinkedAccountsMock.mockReset();
    useQueryClientMock.mockReset();
    syncLinkedAccountsMock.mockReset();
    toastMock.error.mockReset();
    window.sessionStorage.removeItem(PENDING_SOCIAL_LINK_STORAGE_KEY);
    useModalStatusMock.mockReturnValue({ isOpen: false });

    usePrivyMock.mockReturnValue(
      buildPrivyState({
        user: {
          farcaster: { fid: 1, username: "alice", displayName: "Alice" },
          twitter: { username: "alice_x", name: "Alice X" },
        },
      })
    );
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
  });

  it("links farcaster successfully", async () => {
    const { result } = renderHook(() => useLinkAccount());

    await act(async () => {
      await result.current.linkFarcaster();
    });

    expect(privyLinkFarcasterMock).toHaveBeenCalled();
  });

  it("captures errors for linkTwitter", async () => {
    privyLinkTwitterMock.mockImplementation(() => {
      throw new Error("client_error: already linked");
    });

    const { result } = renderHook(() => useLinkAccount());

    await act(async () => {
      await result.current.linkTwitter();
    });

    expect(toastMock.error).toHaveBeenCalled();
    expect(result.current.error).toBe("client_error: already linked");
    expect(result.current.isLinking).toBe(false);
  });

  it("merges linked accounts", () => {
    const { result } = renderHook(() => useLinkAccount());

    expect(result.current.linkedAccounts.farcaster?.fid).toBe(1);
    expect(result.current.linkedAccounts.farcaster?.source).toBe("session");
    expect(result.current.linkedAccounts.twitter?.username).toBe("alice_x");
    expect(result.current.linkedAccounts.twitter?.source).toBe("session");
    expect(result.current.isLinked("farcaster")).toBe(true);
    expect(result.current.isLinked("twitter")).toBe(true);
  });

  it("clears linking state on success and refreshes linked-account state", async () => {
    let privyState = buildPrivyState({
      user: { farcaster: null, twitter: null },
    });
    usePrivyMock.mockImplementation(() => privyState);

    const { result, rerender } = renderHook(() => useLinkAccount());
    expect(result.current.linkedAccounts.farcaster).toBeNull();

    await act(async () => {
      await result.current.linkFarcaster();
    });
    expect(result.current.isLinkingType("farcaster")).toBe(true);

    privyState = buildPrivyState({
      user: {
        farcaster: { fid: 2, username: "bob", displayName: "Bob" },
        twitter: null,
      },
    });

    await act(async () => {
      rerender();
      await flushPromises();
    });

    expect(result.current.isLinking).toBe(false);
    expect(result.current.error).toBeNull();
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

  it("resumes pending link success after remount from session storage", async () => {
    window.sessionStorage.setItem(PENDING_SOCIAL_LINK_STORAGE_KEY, "twitter");
    usePrivyMock.mockReturnValue(
      buildPrivyState({
        user: {
          farcaster: null,
          twitter: { username: "alice_x", name: "Alice X" },
        },
      })
    );

    renderHook(() => useLinkAccount());
    await flushPromises();

    expect(syncLinkedAccountsMock).toHaveBeenCalled();
    expect(window.sessionStorage.getItem(PENDING_SOCIAL_LINK_STORAGE_KEY)).toBeNull();
  });

  it("falls back to generic error messaging", async () => {
    privyLinkFarcasterMock.mockImplementation(() => {
      throw "";
    });

    const { result } = renderHook(() => useLinkAccount());

    await act(async () => {
      await result.current.linkFarcaster();
    });

    expect(toastMock.error).toHaveBeenCalledWith("Failed to link account");
    expect(result.current.error).toBe("Failed to link account");
  });

  it("clears farcaster linking state when the Privy modal closes without success", async () => {
    const privyState = buildPrivyState({
      user: { farcaster: null, twitter: null },
    });
    let isOpen = false;
    usePrivyMock.mockImplementation(() => privyState);
    useModalStatusMock.mockImplementation(() => ({ isOpen }));

    const { result, rerender } = renderHook(() => useLinkAccount());

    await act(async () => {
      await result.current.linkFarcaster();
    });
    expect(result.current.isLinking).toBe(true);

    isOpen = true;
    rerender();
    expect(result.current.isLinking).toBe(true);

    isOpen = false;
    rerender();
    expect(result.current.isLinking).toBe(false);
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

    const { result } = renderHook(() => useLinkAccount());

    expect(result.current.linkedAccounts.farcaster?.fid).toBe(1);
  });

  it("does not invent linked-account state when the live session and db sources are empty", () => {
    usePrivyMock.mockReturnValue(
      buildPrivyState({
        user: { farcaster: null, twitter: null },
      })
    );
    useLinkedAccountsMock.mockReturnValue({
      data: { address: "0x" + "a".repeat(40), accounts: [] },
      isLoading: false,
      mutate: vi.fn(),
    });

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
    usePrivyMock.mockReturnValue(
      buildPrivyState({
        user: { farcaster: null, twitter: null },
      })
    );
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
    usePrivyMock.mockReturnValue(
      buildPrivyState({
        user: { farcaster: null, twitter: null },
      })
    );
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
    usePrivyMock.mockReturnValue(
      buildPrivyState({
        user: {
          farcaster: { fid: 9, username: "verified_fc", displayName: "Verified FC" },
          twitter: null,
        },
      })
    );
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

    const { result } = renderHook(() => useLinkAccount());

    expect(result.current.linkedAccounts.farcaster?.source).toBe("detected");
    expect(result.current.isLinked("farcaster")).toBe(false);
  });

  it("surfaces sync errors on successful link completion", async () => {
    let privyState = buildPrivyState({
      user: { farcaster: null, twitter: null },
    });
    usePrivyMock.mockImplementation(() => privyState);
    syncLinkedAccountsMock.mockRejectedValueOnce(new Error("boom"));

    const { result, rerender } = renderHook(() => useLinkAccount());

    await act(async () => {
      await result.current.linkFarcaster();
    });

    privyState = buildPrivyState({
      user: {
        farcaster: { fid: 4, username: "sync_fc", displayName: "Sync FC" },
        twitter: null,
      },
    });

    await act(async () => {
      rerender();
      await flushPromises();
    });

    expect(toastMock.error).toHaveBeenCalledWith("Failed to sync linked accounts.");
  });

  it("warns when syncing without a wallet", async () => {
    let privyState = buildPrivyState({
      user: { farcaster: null, twitter: null },
    });
    usePrivyMock.mockImplementation(() => privyState);
    syncLinkedAccountsMock.mockResolvedValueOnce({ ok: false, reason: "missing_address" });

    const { result, rerender } = renderHook(() => useLinkAccount());

    await act(async () => {
      await result.current.linkFarcaster();
    });

    privyState = buildPrivyState({
      user: {
        farcaster: { fid: 5, username: "walletless_fc", displayName: "Walletless FC" },
        twitter: null,
      },
    });

    await act(async () => {
      rerender();
      await flushPromises();
    });

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
