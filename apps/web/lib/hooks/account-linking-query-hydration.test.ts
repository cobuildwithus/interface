/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));
const { useUserContextMock } = vi.hoisted(() => ({ useUserContextMock: vi.fn() }));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (args: Parameters<typeof useQueryMock>[0]) => useQueryMock(args),
}));

vi.mock("@/lib/domains/auth/user-context", () => ({
  useUserContext: () => useUserContextMock(),
}));

import {
  getAuthIdentityKey,
  getFarcasterSignerQueryKey,
  getLinkedAccountsQueryKey,
} from "@/lib/hooks/query-keys";
import { useFarcasterSigner } from "./use-farcaster-signer";
import { useLinkedAccounts } from "./use-linked-accounts";

describe("account-linking query hydration", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useUserContextMock.mockReset();
    useUserContextMock.mockReturnValue(null);
  });

  it("passes initial linked-account data through to react-query", () => {
    const initialData = {
      address: `0x${"d".repeat(40)}`,
      accounts: [
        {
          platform: "x" as const,
          platformId: "alice_x",
          username: "alice_x",
          displayName: "Alice X",
          avatarUrl: null,
          source: "privy" as const,
          canPost: false,
          updatedAt: "now",
        },
      ],
    };
    useQueryMock.mockReturnValueOnce({
      data: initialData,
      isLoading: false,
      refetch: vi.fn(),
    });
    useUserContextMock.mockReturnValue({
      address: initialData.address,
      farcaster: null,
      twitter: null,
    });

    const { result } = renderHook(() => useLinkedAccounts({ initialData }));

    expect(result.current.data).toEqual(initialData);
    expect(useQueryMock.mock.calls[0]?.[0]).toMatchObject({
      queryKey: getLinkedAccountsQueryKey(
        getAuthIdentityKey({ address: initialData.address, farcasterFid: null })
      ),
      initialData,
    });
  });

  it("drops farcaster-only linked-account seeds when the identity key does not match", () => {
    const initialData = {
      address: null,
      accounts: [
        {
          platform: "farcaster" as const,
          platformId: "7",
          username: "seeded_fc",
          displayName: "Seeded FC",
          avatarUrl: null,
          source: "verified_address" as const,
          canPost: false,
          updatedAt: "now",
        },
      ],
    };
    useQueryMock.mockReturnValueOnce({
      data: initialData,
      isLoading: false,
      refetch: vi.fn(),
    });
    useUserContextMock.mockReturnValue({
      address: null,
      farcaster: { fid: 11 },
      twitter: null,
    });

    renderHook(() =>
      useLinkedAccounts({
        initialData,
        initialIdentityKey: getAuthIdentityKey({ address: null, farcasterFid: 7 }),
      })
    );

    expect(useQueryMock.mock.calls[0]?.[0]).toMatchObject({
      queryKey: getLinkedAccountsQueryKey(getAuthIdentityKey({ address: null, farcasterFid: 11 })),
      initialData: undefined,
    });
  });

  it("passes initial signer status through to react-query", () => {
    const address = `0x${"c".repeat(40)}`;
    const initialStatus = {
      fid: 7,
      hasSigner: true,
      signerPermissions: ["write_all"],
      neynarPermissions: ["write_all"],
      neynarStatus: "approved" as const,
      neynarError: null,
      updatedAt: "seeded",
    };
    useQueryMock.mockReturnValueOnce({
      data: initialStatus,
      isLoading: false,
      refetch: vi.fn(),
    });
    useUserContextMock.mockReturnValue({
      address,
      farcaster: { fid: 99 },
      twitter: null,
    });

    const { result } = renderHook(() =>
      useFarcasterSigner({
        initialStatus,
        initialIdentityKey: getAuthIdentityKey({ address, farcasterFid: initialStatus.fid }),
      })
    );

    expect(result.current.status).toEqual(initialStatus);
    expect(useQueryMock.mock.calls[0]?.[0]).toMatchObject({
      queryKey: getFarcasterSignerQueryKey(getAuthIdentityKey({ address, farcasterFid: 99 })),
      initialData: initialStatus,
    });
  });
});
