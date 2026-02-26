import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";

import { getFidsByAddresses } from "./address-lookup";

vi.mock("server-only", () => ({}));

const mockFindMany = vi.fn();

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    farcasterProfile: {
      findMany: (...args: Parameters<typeof mockFindMany>) => mockFindMany(...args),
    },
  },
}));

const passthroughCache = vi.hoisted(
  () =>
    ((
      fn: Parameters<typeof unstableCache>[0],
      _keyParts?: Parameters<typeof unstableCache>[1],
      _options?: Parameters<typeof unstableCache>[2]
    ) => fn) as typeof unstableCache
);
vi.mock("next/cache", () => ({
  unstable_cache: passthroughCache,
}));

describe("getFidsByAddresses", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty map for empty input", async () => {
    const result = await getFidsByAddresses([]);

    expect(result.size).toBe(0);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns empty map when all addresses are empty strings", async () => {
    const result = await getFidsByAddresses(["", "  ", ""]);

    expect(result.size).toBe(0);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("normalizes addresses to lowercase", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    await getFidsByAddresses(["0xABC123", "0xDEF456"]);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { verifiedAddresses: { hasSome: ["0xabc123", "0xdef456"] } },
      select: { fid: true, verifiedAddresses: true, neynarUserScore: true },
    });
  });

  it("deduplicates addresses", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    await getFidsByAddresses(["0xabc", "0xABC", "0xABc"]);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { verifiedAddresses: { hasSome: ["0xabc"] } },
      select: expect.any(Object),
    });
  });

  it("returns fid and score for matched addresses", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        fid: BigInt(123),
        verifiedAddresses: ["0xwallet1", "0xwallet2"],
        neynarUserScore: 0.8,
      },
    ]);

    const result = await getFidsByAddresses(["0xwallet1"]);

    expect(result.size).toBe(2);
    expect(result.get("0xwallet1")).toEqual({ fid: 123, neynarUserScore: 0.8 });
    expect(result.get("0xwallet2")).toEqual({ fid: 123, neynarUserScore: 0.8 });
  });

  it("returns null score when neynarUserScore is not a number", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        fid: BigInt(123),
        verifiedAddresses: ["0xwallet1"],
        neynarUserScore: "invalid",
      },
    ]);

    const result = await getFidsByAddresses(["0xwallet1"]);

    expect(result.get("0xwallet1")).toEqual({ fid: 123, neynarUserScore: null });
  });

  it("returns null score when neynarUserScore is NaN", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        fid: BigInt(123),
        verifiedAddresses: ["0xwallet1"],
        neynarUserScore: NaN,
      },
    ]);

    const result = await getFidsByAddresses(["0xwallet1"]);

    expect(result.get("0xwallet1")).toEqual({ fid: 123, neynarUserScore: null });
  });

  it("returns null score when neynarUserScore is null", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        fid: BigInt(123),
        verifiedAddresses: ["0xwallet1"],
        neynarUserScore: null,
      },
    ]);

    const result = await getFidsByAddresses(["0xwallet1"]);

    expect(result.get("0xwallet1")).toEqual({ fid: 123, neynarUserScore: null });
  });

  it("handles valid score of 0", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        fid: BigInt(123),
        verifiedAddresses: ["0xwallet1"],
        neynarUserScore: 0,
      },
    ]);

    const result = await getFidsByAddresses(["0xwallet1"]);

    expect(result.get("0xwallet1")).toEqual({ fid: 123, neynarUserScore: 0 });
  });

  it("handles valid score of 1", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        fid: BigInt(123),
        verifiedAddresses: ["0xwallet1"],
        neynarUserScore: 1,
      },
    ]);

    const result = await getFidsByAddresses(["0xwallet1"]);

    expect(result.get("0xwallet1")).toEqual({ fid: 123, neynarUserScore: 1 });
  });

  it("returns empty map on database error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFindMany.mockRejectedValueOnce(new Error("DB connection failed"));

    const result = await getFidsByAddresses(["0xwallet1"]);

    expect(result.size).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("handles multiple profiles with different fids", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        fid: BigInt(123),
        verifiedAddresses: ["0xwallet1"],
        neynarUserScore: 0.7,
      },
      {
        fid: BigInt(456),
        verifiedAddresses: ["0xwallet2"],
        neynarUserScore: 0.9,
      },
    ]);

    const result = await getFidsByAddresses(["0xwallet1", "0xwallet2"]);

    expect(result.size).toBe(2);
    expect(result.get("0xwallet1")).toEqual({ fid: 123, neynarUserScore: 0.7 });
    expect(result.get("0xwallet2")).toEqual({ fid: 456, neynarUserScore: 0.9 });
  });

  it("first match wins when address appears in multiple profiles", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        fid: BigInt(123),
        verifiedAddresses: ["0xshared"],
        neynarUserScore: 0.5,
      },
      {
        fid: BigInt(456),
        verifiedAddresses: ["0xshared"],
        neynarUserScore: 0.9,
      },
    ]);

    const result = await getFidsByAddresses(["0xshared"]);

    expect(result.size).toBe(1);
    expect(result.get("0xshared")).toEqual({ fid: 123, neynarUserScore: 0.5 });
  });

  it("handles null verifiedAddresses array", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        fid: BigInt(123),
        verifiedAddresses: null,
        neynarUserScore: 0.8,
      },
    ]);

    const result = await getFidsByAddresses(["0xwallet1"]);

    expect(result.size).toBe(0);
  });

  it("lowercases addresses in returned map keys", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        fid: BigInt(123),
        verifiedAddresses: ["0xWALLET"],
        neynarUserScore: 0.8,
      },
    ]);

    const result = await getFidsByAddresses(["0xWALLET"]);

    expect(result.has("0xwallet")).toBe(true);
    expect(result.has("0xWALLET")).toBe(false);
  });
});
