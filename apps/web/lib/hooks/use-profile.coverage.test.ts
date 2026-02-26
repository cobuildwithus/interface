/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const useQueryMock = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (args: Parameters<typeof useQueryMock>[0]) => useQueryMock(args),
}));

import { useProfile } from "@/lib/hooks/use-profile";

const ADDRESS = "0x" + "a".repeat(40);

describe("useProfile", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
  });

  it("calls useQuery with enabled flag and placeholder", async () => {
    useQueryMock.mockReturnValue({ data: null });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: () => ({ address: ADDRESS }) });
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useProfile(ADDRESS));

    const call = useQueryMock.mock.calls[0][0];
    expect(call.enabled).toBe(true);
    expect(call.placeholderData?.address).toBe(ADDRESS);

    await expect(call.queryFn()).rejects.toThrow("Failed to fetch profile");
    await expect(call.queryFn()).resolves.toEqual({ address: ADDRESS });
  });

  it("disables query when no address", () => {
    useQueryMock.mockReturnValue({ data: null });
    renderHook(() => useProfile(undefined));
    const call = useQueryMock.mock.calls[0][0];
    expect(call.enabled).toBe(false);
  });
});
