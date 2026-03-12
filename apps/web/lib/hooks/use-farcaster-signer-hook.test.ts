/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));
const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));
const { useUserContextMock } = vi.hoisted(() => ({ useUserContextMock: vi.fn() }));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (args: Parameters<typeof useQueryMock>[0]) => useQueryMock(args),
}));

vi.mock("@/lib/domains/auth/user-context", () => ({
  useUserContext: () => useUserContextMock(),
}));

import { getAuthIdentityKey, getFarcasterSignerQueryKey } from "@/lib/hooks/query-keys";
import { fetchSignerStatus, useFarcasterSigner } from "./use-farcaster-signer";

describe("useFarcasterSigner", () => {
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

    const { result } = renderHook(() => useFarcasterSigner());

    expect(result.current.status.hasSigner).toBe(false);
    expect(result.current.status.fid).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(useQueryMock.mock.calls[0]?.[0]).toMatchObject({
      queryKey: getFarcasterSignerQueryKey("anonymous"),
      refetchOnWindowFocus: false,
    });
  });

  it("returns data when present and refetches on mutate", async () => {
    const refetch = vi.fn().mockResolvedValue({
      data: {
        fid: 2,
        hasSigner: true,
        signerPermissions: ["write_all"],
        neynarPermissions: ["write_all"],
        neynarStatus: "approved",
        neynarError: null,
        updatedAt: "next",
      },
    });
    useQueryMock.mockReturnValueOnce({
      data: {
        fid: 1,
        hasSigner: true,
        signerPermissions: ["write_all"],
        neynarPermissions: ["write_all"],
        neynarStatus: "approved",
        neynarError: null,
        updatedAt: "now",
      },
      isLoading: false,
      refetch,
    });

    const { result } = renderHook(() => useFarcasterSigner());

    expect(result.current.status.hasSigner).toBe(true);
    expect(result.current.status.fid).toBe(1);

    await act(async () => {
      await result.current.mutate();
    });

    expect(refetch).toHaveBeenCalled();
  });

  it("ignores stale signer snapshots after the active farcaster identity changes", () => {
    useUserContextMock.mockReturnValue({
      address: null,
      farcaster: { fid: 11 },
      twitter: null,
    });
    useQueryMock.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderHook(() =>
      useFarcasterSigner({
        initialStatus: {
          fid: 7,
          hasSigner: true,
          signerPermissions: ["write_all"],
          neynarPermissions: ["write_all"],
          neynarStatus: "approved",
          neynarError: null,
          updatedAt: "seeded",
        },
        initialIdentityKey: getAuthIdentityKey({ address: null, farcasterFid: 7 }),
      })
    );

    expect(useQueryMock.mock.calls[0]?.[0]).toMatchObject({
      queryKey: getFarcasterSignerQueryKey(getAuthIdentityKey({ address: null, farcasterFid: 11 })),
      initialData: undefined,
    });
  });

  it("hydrates wallet-backed signer snapshots when the identity key matches the wallet", () => {
    const address = `0x${"a".repeat(40)}`;
    const initialStatus = {
      fid: 7,
      hasSigner: true,
      signerPermissions: ["write_all"],
      neynarPermissions: ["write_all"],
      neynarStatus: "approved" as const,
      neynarError: null,
      updatedAt: "seeded",
    };
    useUserContextMock.mockReturnValue({
      address,
      farcaster: { fid: 11 },
      twitter: null,
    });
    useQueryMock.mockReturnValueOnce({
      data: initialStatus,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderHook(() =>
      useFarcasterSigner({
        initialStatus,
        initialIdentityKey: getAuthIdentityKey({ address, farcasterFid: initialStatus.fid }),
      })
    );

    expect(useQueryMock.mock.calls[0]?.[0]).toMatchObject({
      queryKey: getFarcasterSignerQueryKey(getAuthIdentityKey({ address, farcasterFid: 11 })),
      initialData: initialStatus,
    });
  });

  it("hydrates fid-backed signer snapshots when the active farcaster fid matches the seed", () => {
    const initialStatus = {
      fid: 11,
      hasSigner: true,
      signerPermissions: ["write_all"],
      neynarPermissions: ["write_all"],
      neynarStatus: "approved" as const,
      neynarError: null,
      updatedAt: "seeded",
    };
    useUserContextMock.mockReturnValue({
      address: null,
      farcaster: { fid: 11 },
      twitter: null,
    });
    useQueryMock.mockReturnValueOnce({
      data: initialStatus,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderHook(() =>
      useFarcasterSigner({
        initialStatus,
      })
    );

    expect(useQueryMock.mock.calls[0]?.[0]).toMatchObject({
      queryKey: getFarcasterSignerQueryKey(getAuthIdentityKey({ address: null, farcasterFid: 11 })),
      initialData: initialStatus,
    });
  });

  it("hydrates anonymous signer seeds only when the active identity is anonymous", () => {
    const initialStatus = {
      fid: null,
      hasSigner: false,
      signerPermissions: null,
      neynarPermissions: null,
      neynarStatus: null,
      neynarError: null,
      updatedAt: "seeded",
    };
    useUserContextMock.mockReturnValue(null);
    useQueryMock.mockReturnValueOnce({
      data: initialStatus,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderHook(() =>
      useFarcasterSigner({
        initialStatus,
      })
    );

    expect(useQueryMock.mock.calls[0]?.[0]).toMatchObject({
      queryKey: getFarcasterSignerQueryKey("anonymous"),
      initialData: initialStatus,
    });
  });

  it("fetches signer status from the API", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        fid: null,
        hasSigner: false,
        signerPermissions: null,
        neynarPermissions: null,
        neynarStatus: null,
        neynarError: null,
        updatedAt: null,
      }),
    });

    const data = await fetchSignerStatus();
    expect(fetchMock).toHaveBeenCalledWith("/api/farcaster/signer", { cache: "no-store" });
    expect(data.hasSigner).toBe(false);
  });

  it("returns empty status when the API fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const data = await fetchSignerStatus();
    expect(data.hasSigner).toBe(false);
    expect(data.fid).toBeNull();
  });

  it("returns empty status when the API throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));

    const data = await fetchSignerStatus();
    expect(data.hasSigner).toBe(false);
    expect(data.fid).toBeNull();
  });
});
