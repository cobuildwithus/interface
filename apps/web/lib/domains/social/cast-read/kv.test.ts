import { beforeEach, describe, expect, it, vi } from "vitest";

const { setMock, mgetMock, incrMock, getMock } = vi.hoisted(() => ({
  setMock: vi.fn(),
  mgetMock: vi.fn(),
  incrMock: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock("@vercel/kv", () => ({
  kv: {
    set: setMock,
    mget: mgetMock,
    incr: incrMock,
    get: getMock,
  },
}));

import { getReadStatusMap, getTopicsViewedCount, markCastRead } from "./kv";

describe("cast-read kv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks reads with normalized keys", async () => {
    const hash = `0x${"a".repeat(40)}`;
    setMock.mockResolvedValueOnce("OK");
    await markCastRead("0xAbC", hash);

    expect(setMock).toHaveBeenCalledWith(`cast:read:0xabc:${"a".repeat(40)}`, "1", { nx: true });
    expect(incrMock).toHaveBeenCalledWith("cast:read:count:0xabc");
  });

  it("skips invalid hashes when marking read", async () => {
    await markCastRead("0xabc", "not-a-hash");
    expect(setMock).not.toHaveBeenCalled();
    expect(incrMock).not.toHaveBeenCalled();
  });

  it("skips marking read when address is empty", async () => {
    const hash = `0x${"f".repeat(40)}`;
    await markCastRead("   ", hash);

    expect(setMock).not.toHaveBeenCalled();
    expect(incrMock).not.toHaveBeenCalled();
  });

  it("swallows kv failures when marking read", async () => {
    const hash = `0x${"1".repeat(40)}`;
    setMock.mockRejectedValueOnce(new Error("boom"));

    await expect(markCastRead("0xabc", hash)).resolves.toBeUndefined();
    expect(incrMock).not.toHaveBeenCalled();
  });

  it("builds a read map for valid hashes", async () => {
    const hashA = `0x${"a".repeat(40)}`;
    const hashB = `0x${"b".repeat(40)}`;
    mgetMock.mockResolvedValueOnce(["1", null]);

    const result = await getReadStatusMap("0xAbC", [hashA, hashB]);

    expect(mgetMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ [hashA]: true, [hashB]: false });
  });

  it("ignores invalid hashes when fetching read status", async () => {
    const hash = `0x${"c".repeat(40)}`;
    mgetMock.mockResolvedValueOnce(["1"]);

    const result = await getReadStatusMap("0xAbC", [hash, "bad"]);

    expect(result).toEqual({ [hash]: true });
  });

  it("returns empty on kv failures", async () => {
    const hash = `0x${"d".repeat(40)}`;
    mgetMock.mockRejectedValueOnce(new Error("boom"));

    const result = await getReadStatusMap("0xAbC", [hash]);

    expect(result).toEqual({});
  });

  it("returns empty when address is invalid for read map", async () => {
    const hash = `0x${"c".repeat(40)}`;
    const result = await getReadStatusMap("   ", [hash]);

    expect(result).toEqual({});
    expect(mgetMock).not.toHaveBeenCalled();
  });

  it("does not increment count when read key already exists", async () => {
    const hash = `0x${"e".repeat(40)}`;
    setMock.mockResolvedValueOnce(null);

    await markCastRead("0xabc", hash);

    expect(incrMock).not.toHaveBeenCalled();
  });

  it("returns topics viewed count from kv", async () => {
    getMock.mockResolvedValueOnce("12");

    const result = await getTopicsViewedCount("0xAbC");

    expect(result).toBe(12);
    expect(getMock).toHaveBeenCalledWith("cast:read:count:0xabc");
  });

  it("returns numeric topics viewed count from kv", async () => {
    getMock.mockResolvedValueOnce(7);

    const result = await getTopicsViewedCount("0xAbC");

    expect(result).toBe(7);
  });

  it("returns bigint topics viewed count from kv", async () => {
    getMock.mockResolvedValueOnce(9n);

    const result = await getTopicsViewedCount("0xAbC");

    expect(result).toBe(9);
  });

  it("returns zero when topics viewed count is missing or invalid", async () => {
    getMock.mockResolvedValueOnce(null);
    const missing = await getTopicsViewedCount("0xAbC");
    expect(missing).toBe(0);

    getMock.mockResolvedValueOnce("nope");
    const invalid = await getTopicsViewedCount("0xAbC");
    expect(invalid).toBe(0);
  });

  it("returns zero when topics viewed count lookup fails", async () => {
    getMock.mockRejectedValueOnce(new Error("boom"));

    const result = await getTopicsViewedCount("0xAbC");

    expect(result).toBe(0);
  });
});
