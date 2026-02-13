import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const queryRawMock = vi.fn();
const kvMgetMock = vi.fn();
const kvGetMock = vi.fn();
const kvSetMock = vi.fn();
const kvDelMock = vi.fn();

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    $replica: () => ({
      $queryRaw: (...args: Parameters<typeof queryRawMock>) => queryRawMock(...args),
    }),
  },
}));

vi.mock("@/lib/integrations/farcaster/urls", () => ({
  getFarcasterChannelUrl: () => "https://farcaster.xyz/channel/cobuild",
}));

vi.mock("@vercel/kv", () => ({
  kv: {
    mget: (...args: Parameters<typeof kvMgetMock>) => kvMgetMock(...args),
    get: (...args: Parameters<typeof kvGetMock>) => kvGetMock(...args),
    set: (...args: Parameters<typeof kvSetMock>) => kvSetMock(...args),
    del: (...args: Parameters<typeof kvDelMock>) => kvDelMock(...args),
  },
}));

import {
  getCobuildActivityByFid,
  getCobuildActivityByFids,
  invalidateCobuildActivityCache,
} from "@/lib/integrations/farcaster/activity";

describe("farcaster activity", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
    kvMgetMock.mockReset();
    kvGetMock.mockReset();
    kvSetMock.mockReset();
    kvDelMock.mockReset();
  });

  it("returns 0 for invalid fids", async () => {
    await expect(getCobuildActivityByFid(0)).resolves.toEqual({ activity: 0, posts: 0 });
    await expect(getCobuildActivityByFid(-10)).resolves.toEqual({ activity: 0, posts: 0 });
    await expect(getCobuildActivityByFid(Number.NaN)).resolves.toEqual({ activity: 0, posts: 0 });
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("returns activity for valid fid", async () => {
    kvMgetMock.mockResolvedValueOnce([null]);
    kvSetMock.mockResolvedValueOnce("OK");
    queryRawMock.mockResolvedValueOnce([{ posts: 42n, periods: 1n }]);
    await expect(getCobuildActivityByFid(123)).resolves.toEqual({ activity: 14, posts: 42 });
  });

  it("falls back to db when cache read fails for fid", async () => {
    kvMgetMock.mockRejectedValueOnce(new Error("boom"));
    kvSetMock.mockResolvedValueOnce("OK");
    queryRawMock.mockResolvedValueOnce([{ posts: 7n, periods: 1n }]);

    await expect(getCobuildActivityByFid(1)).resolves.toEqual({ activity: 7, posts: 7 });
  });

  it("ignores cache write failures", async () => {
    kvMgetMock.mockResolvedValueOnce([null]);
    kvSetMock.mockResolvedValueOnce("OK").mockRejectedValueOnce(new Error("boom"));
    queryRawMock.mockResolvedValueOnce([{ posts: 1n, periods: 1n }]);

    await expect(getCobuildActivityByFid(123)).resolves.toEqual({ activity: 1, posts: 1 });
  });

  it("returns cached activity for valid fid", async () => {
    kvMgetMock.mockResolvedValueOnce([{ activity: 3, posts: 3 }]);

    await expect(getCobuildActivityByFid(10)).resolves.toEqual({ activity: 3, posts: 3 });

    expect(queryRawMock).not.toHaveBeenCalled();
    expect(kvSetMock).not.toHaveBeenCalled();
  });

  it("waits for cached activity when lock is held", async () => {
    vi.useFakeTimers();
    kvMgetMock.mockResolvedValueOnce([null]).mockResolvedValueOnce([{ activity: 8, posts: 8 }]);
    kvSetMock.mockResolvedValueOnce(null);

    const promise = getCobuildActivityByFid(22);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ activity: 8, posts: 8 });

    expect(queryRawMock).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("returns activity map for unique fids", async () => {
    kvMgetMock.mockResolvedValueOnce([null, null]);
    queryRawMock.mockResolvedValueOnce([
      { fid: 1n, posts: 2n, periods: 1n },
      { fid: 2n, posts: 40, periods: 2 },
    ]);

    const map = await getCobuildActivityByFids([1, 2, 2, null, undefined, -5]);

    expect(map.size).toBe(2);
    expect(map.get(1)).toEqual({ activity: 2, posts: 2 });
    expect(map.get(2)).toEqual({ activity: 28, posts: 40 });
  });

  it("returns cached activity map when available", async () => {
    kvMgetMock.mockResolvedValueOnce([
      { activity: 5, posts: 5 },
      { activity: 9, posts: 12 },
    ]);

    const map = await getCobuildActivityByFids([1, 2]);

    expect(map.size).toBe(2);
    expect(map.get(1)).toEqual({ activity: 5, posts: 5 });
    expect(map.get(2)).toEqual({ activity: 9, posts: 12 });
    expect(queryRawMock).not.toHaveBeenCalled();
    expect(kvSetMock).not.toHaveBeenCalled();
  });

  it("falls back to batch query when cache read fails", async () => {
    kvMgetMock.mockRejectedValueOnce(new Error("boom"));
    queryRawMock.mockResolvedValueOnce([{ fid: 1n, posts: 2n, periods: 1n }]);

    const map = await getCobuildActivityByFids([1]);

    expect(map.get(1)).toEqual({ activity: 2, posts: 2 });
  });

  it("fills missing fids with zeros when batch query returns fewer rows", async () => {
    kvMgetMock.mockResolvedValueOnce([null, null]);
    queryRawMock.mockResolvedValueOnce([{ fid: 2n, posts: 4n, periods: 1n }]);

    const map = await getCobuildActivityByFids([1, 2]);

    expect(map.get(1)).toEqual({ activity: 0, posts: 0 });
    expect(map.get(2)).toEqual({ activity: 4, posts: 4 });
  });

  it("invalidates activity cache for valid fids", async () => {
    await invalidateCobuildActivityCache(5);
    await invalidateCobuildActivityCache(0);

    expect(kvDelMock).toHaveBeenCalledTimes(1);
  });
});
