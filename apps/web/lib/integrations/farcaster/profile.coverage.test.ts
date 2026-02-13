import { describe, expect, it, vi, beforeEach } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";

const prismaMock = vi.hoisted(() => ({
  farcasterProfile: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({ default: prismaMock }));
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

import {
  getFidsByUsernames,
  getFarcasterByVerifiedAddress,
  getProfileMetaByFid,
} from "@/lib/integrations/farcaster/profile";

describe("farcaster profile helpers", () => {
  beforeEach(() => {
    prismaMock.farcasterProfile.findMany.mockReset();
    prismaMock.farcasterProfile.findFirst.mockReset();
    prismaMock.farcasterProfile.findUnique.mockReset();
  });

  it("returns fids and notFound", async () => {
    prismaMock.farcasterProfile.findMany.mockResolvedValue([{ fid: 1n, fname: "alice" }]);

    const result = await getFidsByUsernames(["Alice", "Bob"]);
    expect(result.fids).toEqual([1]);
    expect(result.notFound).toEqual(["bob"]);
  });

  it("returns empty for no usernames", async () => {
    const result = await getFidsByUsernames([]);
    expect(result).toEqual({ fids: [], notFound: [] });
  });

  it("returns profile or undefined", async () => {
    prismaMock.farcasterProfile.findFirst
      .mockResolvedValueOnce({
        fid: 2n,
        fname: "alice",
        displayName: "Alice",
        avatarUrl: "a",
        neynarUserScore: 0.9,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        fid: 3n,
        fname: "bob",
        displayName: null,
        avatarUrl: null,
        neynarUserScore: "bad",
      })
      .mockRejectedValueOnce(new Error("boom"));

    const profile = await getFarcasterByVerifiedAddress("0xABC");
    expect(profile?.fid).toBe(2);
    expect(profile?.neynarScore).toBe(0.9);

    const missing = await getFarcasterByVerifiedAddress("0xABC");
    expect(missing).toBeUndefined();

    const invalidScore = await getFarcasterByVerifiedAddress("0xABC");
    expect(invalidScore?.neynarScore).toBeNull();

    const failed = await getFarcasterByVerifiedAddress("0xABC");
    expect(failed).toBeUndefined();
  });

  it("returns profile meta or undefined by fid", async () => {
    prismaMock.farcasterProfile.findUnique
      .mockResolvedValueOnce({ bio: "Hello", neynarUserScore: 0.91 })
      .mockResolvedValueOnce({ bio: null, neynarUserScore: "bad" })
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("boom"));

    const meta = await getProfileMetaByFid(1);
    expect(meta).toEqual({ bio: "Hello", neynarScore: 0.91 });

    const invalidScore = await getProfileMetaByFid(1);
    expect(invalidScore).toEqual({ bio: undefined, neynarScore: null });

    const missing = await getProfileMetaByFid(1);
    expect(missing).toBeUndefined();

    const failed = await getProfileMetaByFid(1);
    expect(failed).toBeUndefined();
  });
});
