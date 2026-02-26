/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const { useSWRMock } = vi.hoisted(() => ({ useSWRMock: vi.fn() }));
const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

vi.mock("swr", () => ({
  default: useSWRMock,
}));

import { fetchSignerStatus, useFarcasterSigner } from "./use-farcaster-signer";

describe("useFarcasterSigner", () => {
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

    const { result } = renderHook(() => useFarcasterSigner());

    expect(result.current.status.hasSigner).toBe(false);
    expect(result.current.status.fid).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(useSWRMock.mock.calls[0]?.[0]).toBe("/api/farcaster/signer");
  });

  it("returns data when present", () => {
    useSWRMock.mockReturnValueOnce({
      data: {
        fid: 1,
        hasSigner: true,
        signerPermissions: ["write_all"],
        updatedAt: "now",
      },
      isLoading: false,
      mutate: vi.fn(),
    });

    const { result } = renderHook(() => useFarcasterSigner());

    expect(result.current.status.hasSigner).toBe(true);
    expect(result.current.status.fid).toBe(1);
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
