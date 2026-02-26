/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const { useSWRMock } = vi.hoisted(() => ({ useSWRMock: vi.fn() }));
const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("swr", () => ({
  default: useSWRMock,
}));

import { fetchLinkedAccounts, useLinkedAccounts } from "./use-linked-accounts";

describe("useLinkedAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
  });

  it("returns defaults when no data", () => {
    useSWRMock.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      mutate: vi.fn(),
    });

    const { result } = renderHook(() => useLinkedAccounts());

    expect(result.current.data.address).toBeNull();
    expect(result.current.data.accounts).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(useSWRMock.mock.calls[0]?.[0]).toBe("/api/linked-accounts");
  });

  it("returns data when present", () => {
    useSWRMock.mockReturnValueOnce({
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
      mutate: vi.fn(),
    });

    const { result } = renderHook(() => useLinkedAccounts());

    expect(result.current.data.accounts).toHaveLength(1);
    expect(result.current.isLoading).toBe(false);
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
