import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { COBUILD_CHANNEL_URL } from "@/lib/integrations/farcaster/casts/shared";
import { upsertCobuildCastByHash } from "./upsert";

const neynarFetchCastByHashMock = vi.fn();
const upsertMock = vi.fn();
const updateThreadStatsForRootsMock = vi.fn();

type NeynarFetchCastByHash =
  typeof import("@/lib/integrations/farcaster/neynar-client").neynarFetchCastByHash;
type FarcasterCastUpsert = (args: Prisma.FarcasterCastUpsertArgs) => Promise<Record<string, never>>;
type UpdateThreadStatsForRoots = typeof import("./thread-stats").updateThreadStatsForRoots;

vi.mock("@/lib/integrations/farcaster/neynar-client", () => ({
  neynarFetchCastByHash: ((...args) => neynarFetchCastByHashMock(...args)) as NeynarFetchCastByHash,
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    farcasterCast: {
      upsert: ((args) => upsertMock(args)) as FarcasterCastUpsert,
    },
  },
}));

vi.mock("./thread-stats", () => ({
  updateThreadStatsForRoots: ((...args) =>
    updateThreadStatsForRootsMock(...args)) as UpdateThreadStatsForRoots,
}));

describe("upsertCobuildCastByHash", () => {
  beforeEach(() => {
    neynarFetchCastByHashMock.mockReset();
    upsertMock.mockReset();
    updateThreadStatsForRootsMock.mockReset();
  });

  it("retries on not-found and upserts when cast resolves", async () => {
    const hash = "0x" + "a".repeat(40);
    const embedHash = "0x" + "b".repeat(40);
    const cast = {
      hash,
      text: "hello @alice world",
      timestamp: new Date().toISOString(),
      parent_hash: null,
      parent_url: null,
      root_parent_url: COBUILD_CHANNEL_URL,
      thread_hash: hash,
      author: { fid: 123 },
      mentioned_profiles: [{ fid: 456 }],
      mentioned_profiles_ranges: [{ start: 6, end: 12 }],
      embeds: [{ cast_id: { fid: 999, hash: embedHash } }],
    };

    neynarFetchCastByHashMock
      .mockResolvedValueOnce({ ok: false, error: "Cast not found.", notFound: true })
      .mockResolvedValueOnce({ ok: true, cast });

    upsertMock.mockResolvedValueOnce({});

    const result = await upsertCobuildCastByHash(hash);

    expect(result).toBe(true);
    expect(neynarFetchCastByHashMock).toHaveBeenCalledTimes(2);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(updateThreadStatsForRootsMock).toHaveBeenCalledTimes(1);

    const call = upsertMock.mock.calls[0]?.[0];
    expect(call?.create?.embedSummaries).toEqual([]);
    expect(call?.update?.mentionedFids).toEqual([BigInt(456)]);
    expect(call?.update?.mentionsPositions).toEqual([6]);
    expect(call?.update?.text).not.toContain("@alice");
    expect(call?.update?.embedsArray).toEqual([{ castId: { fid: 999, hash: embedHash } }]);
    expect(call?.update?.rootParentUrl).toBe(COBUILD_CHANNEL_URL);
  });

  it("skips upsert for non-cobuild root parent url", async () => {
    const hash = "0x" + "c".repeat(40);
    neynarFetchCastByHashMock.mockResolvedValueOnce({
      ok: true,
      cast: {
        hash,
        text: "hello",
        timestamp: new Date().toISOString(),
        parent_hash: null,
        parent_url: null,
        root_parent_url: "https://farcaster.xyz/~/channel/other",
        thread_hash: hash,
        author: { fid: 1 },
      },
    });

    const result = await upsertCobuildCastByHash(hash);

    expect(result).toBe(false);
    expect(upsertMock).not.toHaveBeenCalled();
    expect(updateThreadStatsForRootsMock).not.toHaveBeenCalled();
  });

  it("returns false when neynar reports deleted", async () => {
    const hash = "0x" + "d".repeat(40);
    neynarFetchCastByHashMock.mockResolvedValueOnce({
      ok: false,
      error: "Cast deleted.",
      deleted: true,
    });

    const result = await upsertCobuildCastByHash(hash);

    expect(result).toBe(false);
    expect(upsertMock).not.toHaveBeenCalled();
    expect(updateThreadStatsForRootsMock).not.toHaveBeenCalled();
  });

  it("returns false when retries are exhausted", async () => {
    vi.useFakeTimers();
    const hash = "0x" + "e".repeat(40);
    neynarFetchCastByHashMock.mockResolvedValue({
      ok: false,
      error: "Cast not found.",
      notFound: true,
    });

    const promise = upsertCobuildCastByHash(hash);
    await vi.runAllTimersAsync();
    const result = await promise;
    vi.useRealTimers();

    expect(result).toBe(false);
    expect(neynarFetchCastByHashMock).toHaveBeenCalledTimes(3);
    expect(upsertMock).not.toHaveBeenCalled();
    expect(updateThreadStatsForRootsMock).not.toHaveBeenCalled();
  });

  it("returns false when hash or fid is invalid", async () => {
    neynarFetchCastByHashMock.mockResolvedValueOnce({
      ok: true,
      cast: {
        hash: "bad",
        text: "hello",
        timestamp: new Date().toISOString(),
        parent_hash: null,
        parent_url: null,
        root_parent_url: COBUILD_CHANNEL_URL,
        thread_hash: "bad",
        author: { fid: 123 },
      },
    });

    const invalidHash = await upsertCobuildCastByHash("bad");
    expect(invalidHash).toBe(false);

    neynarFetchCastByHashMock.mockResolvedValueOnce({
      ok: true,
      cast: {
        hash: "0x" + "f".repeat(40),
        text: "hello",
        timestamp: new Date().toISOString(),
        parent_hash: null,
        parent_url: null,
        root_parent_url: COBUILD_CHANNEL_URL,
        thread_hash: "0x" + "f".repeat(40),
        author: { fid: 0 },
      },
    });

    const invalidFid = await upsertCobuildCastByHash("0x" + "f".repeat(40));
    expect(invalidFid).toBe(false);
    expect(upsertMock).not.toHaveBeenCalled();
    expect(updateThreadStatsForRootsMock).not.toHaveBeenCalled();
  });

  it("skips invalid embeds and keeps text when mention ranges are empty", async () => {
    const hash = "0x" + "1".repeat(40);
    neynarFetchCastByHashMock.mockResolvedValueOnce({
      ok: true,
      cast: {
        hash,
        text: null,
        timestamp: "invalid",
        parent_hash: "0x" + "2".repeat(40),
        parent_url: "https://example.com",
        root_parent_url: COBUILD_CHANNEL_URL,
        thread_hash: hash,
        author: { fid: 42 },
        embeds: [{ cast_id: { fid: null, hash: null } }, null],
        mentioned_profiles: [],
        mentioned_profiles_ranges: [{ start: null, end: 2 }],
        parent_author: { fid: 7 },
      },
    });

    upsertMock.mockResolvedValueOnce({});

    const result = await upsertCobuildCastByHash(hash);

    expect(result).toBe(true);
    const call = upsertMock.mock.calls[0]?.[0];
    expect(call?.update?.embedsArray).toBeUndefined();
    expect(call?.update?.mentionsPositions).toEqual([]);
    expect(call?.update?.mentionedFids).toEqual([]);
    expect(call?.update?.parentFid).toBe(BigInt(7));
    expect(updateThreadStatsForRootsMock).toHaveBeenCalledTimes(1);
  });

  it("handles missing optional fields and null timestamps", async () => {
    const hash = "0x" + "9".repeat(40);
    neynarFetchCastByHashMock.mockResolvedValueOnce({
      ok: true,
      cast: {
        hash,
        text: "hello",
        timestamp: null,
        parent_hash: null,
        parent_url: null,
        root_parent_url: COBUILD_CHANNEL_URL,
        thread_hash: null,
        author: { fid: 321 },
      },
    });

    upsertMock.mockResolvedValueOnce({});

    const result = await upsertCobuildCastByHash(hash);

    expect(result).toBe(true);
    const call = upsertMock.mock.calls[0]?.[0];
    expect(call?.create?.castTimestamp).toBeNull();
    expect(call?.update?.embedsArray).toBeUndefined();
    expect(call?.update?.mentionsPositions).toEqual([]);
    expect(call?.update?.mentionedFids).toEqual([]);
    expect(updateThreadStatsForRootsMock).toHaveBeenCalledTimes(1);
  });
});
