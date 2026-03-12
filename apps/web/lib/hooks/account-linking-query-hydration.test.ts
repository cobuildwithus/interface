/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (args: Parameters<typeof useQueryMock>[0]) => useQueryMock(args),
}));

import { FARCASTER_SIGNER_QUERY_KEY, LINKED_ACCOUNTS_QUERY_KEY } from "@/lib/hooks/query-keys";
import { useFarcasterSigner } from "./use-farcaster-signer";
import { useLinkedAccounts } from "./use-linked-accounts";

describe("account-linking query hydration", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
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

    const { result } = renderHook(() => useLinkedAccounts({ initialData }));

    expect(result.current.data).toEqual(initialData);
    expect(useQueryMock.mock.calls[0]?.[0]).toMatchObject({
      queryKey: LINKED_ACCOUNTS_QUERY_KEY,
      initialData,
    });
  });

  it("passes initial signer status through to react-query", () => {
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

    const { result } = renderHook(() => useFarcasterSigner({ initialStatus }));

    expect(result.current.status).toEqual(initialStatus);
    expect(useQueryMock.mock.calls[0]?.[0]).toMatchObject({
      queryKey: FARCASTER_SIGNER_QUERY_KEY,
      initialData: initialStatus,
    });
  });
});
