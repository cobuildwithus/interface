/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));
const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
const { useUserContextMock } = vi.hoisted(() => ({ useUserContextMock: vi.fn() }));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (args: Parameters<typeof useQueryMock>[0]) => useQueryMock(args),
}));

vi.mock("@/lib/domains/auth/user-context", () => ({
  useUserContext: () => useUserContextMock(),
}));

import { getAuthIdentityKey, getLinkedAccountsQueryKey } from "@/lib/hooks/query-keys";
import { fetchLinkedAccounts, useLinkedAccounts } from "./use-linked-accounts";

describe("useLinkedAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQueryMock.mockReset();
    fetchMock.mockReset();
    useUserContextMock.mockReset();
    useUserContextMock.mockReturnValue(null);
    global.fetch = fetchMock as typeof fetch;
  });

  it("returns defaults when no data", () => {
    const refetch = vi.fn().mockResolvedValue({ data: undefined });
    useQueryMock.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      refetch,
    });

    const { result } = renderHook(() => useLinkedAccounts());

    expect(result.current.data.address).toBeNull();
    expect(result.current.data.accounts).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(useQueryMock.mock.calls[0]?.[0]).toMatchObject({
      queryKey: getLinkedAccountsQueryKey("anonymous"),
      refetchOnWindowFocus: false,
    });
  });

  it("returns data when present and refetches on mutate", async () => {
    const refetch = vi.fn().mockResolvedValue({
      data: {
        address: `0x${"c".repeat(40)}`,
        accounts: [],
      },
    });
    useQueryMock.mockReturnValueOnce({
      data: {
        address: `0x${"b".repeat(40)}`,
        accounts: [
          {
            platform: "farcaster",
            platformId: "1",
            username: "alice",
            displayName: "Alice",
            avatarUrl: null,
            source: "privy",
            canPost: false,
            updatedAt: "now",
          },
        ],
      },
      isLoading: false,
      refetch,
    });

    const { result } = renderHook(() => useLinkedAccounts());

    expect(result.current.data.accounts).toHaveLength(1);
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      await result.current.mutate();
    });

    expect(refetch).toHaveBeenCalled();
  });

  it("ignores stale initial data after the active wallet changes", () => {
    const activeAddress = `0x${"a".repeat(40)}`;
    useUserContextMock.mockReturnValue({ address: activeAddress, farcaster: null, twitter: null });
    useQueryMock.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderHook(() =>
      useLinkedAccounts({
        initialData: {
          address: `0x${"b".repeat(40)}`,
          accounts: [],
        },
      })
    );

    expect(useQueryMock.mock.calls[0]?.[0]).toMatchObject({
      queryKey: getLinkedAccountsQueryKey(
        getAuthIdentityKey({ address: activeAddress, farcasterFid: null })
      ),
      initialData: undefined,
    });
  });

  it("hydrates matching wallet-linked seeds when the explicit identity key matches", () => {
    const activeAddress = `0x${"a".repeat(40)}`;
    const initialData = {
      address: activeAddress,
      accounts: [],
    };
    useUserContextMock.mockReturnValue({ address: activeAddress, farcaster: null, twitter: null });
    useQueryMock.mockReturnValueOnce({
      data: initialData,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderHook(() =>
      useLinkedAccounts({
        initialData,
        initialIdentityKey: getAuthIdentityKey({ address: activeAddress, farcasterFid: null }),
      })
    );

    expect(useQueryMock.mock.calls[0]?.[0]).toMatchObject({
      queryKey: getLinkedAccountsQueryKey(
        getAuthIdentityKey({ address: activeAddress, farcasterFid: null })
      ),
      initialData,
    });
  });

  it("hydrates anonymous seeds only when they are also anonymous", () => {
    const initialData = {
      address: null,
      accounts: [],
    };
    useUserContextMock.mockReturnValue(null);
    useQueryMock.mockReturnValueOnce({
      data: initialData,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderHook(() =>
      useLinkedAccounts({
        initialData,
      })
    );

    expect(useQueryMock.mock.calls[0]?.[0]).toMatchObject({
      queryKey: getLinkedAccountsQueryKey("anonymous"),
      initialData,
    });
  });

  it("fetches linked accounts from the API", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        address: `0x${"c".repeat(40)}`,
        accounts: [],
      }),
    });

    const data = await fetchLinkedAccounts();
    expect(fetchMock).toHaveBeenCalledWith("/api/linked-accounts", { cache: "no-store" });
    expect(data.address).toBe(`0x${"c".repeat(40)}`);
  });

  it("returns empty data when the API fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const data = await fetchLinkedAccounts();
    expect(data.address).toBeNull();
    expect(data.accounts).toEqual([]);
  });

  it("returns empty data when the API throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));

    const data = await fetchLinkedAccounts();
    expect(data.address).toBeNull();
    expect(data.accounts).toEqual([]);
  });
});
