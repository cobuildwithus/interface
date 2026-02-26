import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fetchSignerStatus } from "./use-farcaster-signer";

const mockFetch = vi.fn();

describe("fetchSignerStatus", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns status when request succeeds", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          fid: 1,
          hasSigner: true,
          signerPermissions: ["write_all"],
          neynarPermissions: ["write_all"],
          neynarStatus: "approved",
          neynarError: null,
          updatedAt: "now",
        }),
    });

    const result = await fetchSignerStatus();

    expect(result).toEqual({
      fid: 1,
      hasSigner: true,
      signerPermissions: ["write_all"],
      neynarPermissions: ["write_all"],
      neynarStatus: "approved",
      neynarError: null,
      updatedAt: "now",
    });
  });

  it("returns empty status when request fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const result = await fetchSignerStatus();

    expect(result.hasSigner).toBe(false);
    expect(result.fid).toBeNull();
  });
});
