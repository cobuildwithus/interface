/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useQueryClientMock, fetchLinkedAccountsMock, fetchSignerStatusMock } = vi.hoisted(() => ({
  useQueryClientMock: vi.fn(),
  fetchLinkedAccountsMock: vi.fn(),
  fetchSignerStatusMock: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => useQueryClientMock(),
}));

vi.mock("@/lib/hooks/use-linked-accounts", () => ({
  fetchLinkedAccounts: fetchLinkedAccountsMock,
}));

vi.mock("@/lib/hooks/use-farcaster-signer", () => ({
  fetchSignerStatus: fetchSignerStatusMock,
}));

import {
  FARCASTER_SIGNER_QUERY_KEY,
  LINKED_ACCOUNTS_QUERY_KEY,
  getProfileQueryKey,
} from "@/lib/hooks/query-keys";
import { useRefreshLinkedAccountState } from "./use-refresh-linked-account-state";

const ADDRESS = `0x${"a".repeat(40)}`;

describe("useRefreshLinkedAccountState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQueryClientMock.mockReset();
    fetchLinkedAccountsMock.mockReset();
    fetchSignerStatusMock.mockReset();
  });

  it("refreshes linked accounts and invalidates the matching profile cache", async () => {
    const fetchQuery = vi.fn().mockResolvedValue(undefined);
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    useQueryClientMock.mockReturnValue({ fetchQuery, invalidateQueries });

    const { result } = renderHook(() => useRefreshLinkedAccountState(ADDRESS));

    await act(async () => {
      await result.current.refreshLinkedAccountState();
    });

    expect(fetchQuery).toHaveBeenCalledTimes(1);
    expect(fetchQuery).toHaveBeenCalledWith({
      queryKey: LINKED_ACCOUNTS_QUERY_KEY,
      queryFn: fetchLinkedAccountsMock,
      staleTime: 0,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: getProfileQueryKey(ADDRESS),
      exact: true,
    });
  });

  it("also refreshes signer state when requested", async () => {
    const fetchQuery = vi.fn().mockResolvedValue(undefined);
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    useQueryClientMock.mockReturnValue({ fetchQuery, invalidateQueries });

    const { result } = renderHook(() => useRefreshLinkedAccountState(ADDRESS));

    await act(async () => {
      await result.current.refreshLinkedAccountState({ includeSigner: true });
    });

    expect(fetchQuery).toHaveBeenCalledTimes(2);
    expect(fetchQuery).toHaveBeenNthCalledWith(1, {
      queryKey: LINKED_ACCOUNTS_QUERY_KEY,
      queryFn: fetchLinkedAccountsMock,
      staleTime: 0,
    });
    expect(fetchQuery).toHaveBeenNthCalledWith(2, {
      queryKey: FARCASTER_SIGNER_QUERY_KEY,
      queryFn: fetchSignerStatusMock,
      staleTime: 0,
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it("skips profile invalidation when no wallet address is available", async () => {
    const fetchQuery = vi.fn().mockResolvedValue(undefined);
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    useQueryClientMock.mockReturnValue({ fetchQuery, invalidateQueries });

    const { result } = renderHook(() => useRefreshLinkedAccountState(null));

    await act(async () => {
      await result.current.refreshLinkedAccountState({ includeSigner: true });
    });

    expect(fetchQuery).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
