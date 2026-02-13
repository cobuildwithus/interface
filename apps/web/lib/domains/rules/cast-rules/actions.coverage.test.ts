import { describe, expect, it, vi, beforeEach } from "vitest";

const runPlatformRulesServerCheckMock = vi.hoisted(() => vi.fn());
const getSessionMock = vi.hoisted(() => vi.fn());
const getOrFetchNeynarScoreMock = vi.hoisted(() => vi.fn());
const normalizeCastHashRawMock = vi.hoisted(() => vi.fn());
const castHashToBufferMock = vi.hoisted(() => vi.fn());
const revalidateTagMock = vi.hoisted(() => vi.fn());
const farcasterPrismaMock = vi.hoisted(() => ({
  farcasterCast: { findUnique: vi.fn() },
}));

vi.mock("@/lib/domains/rules/rules/core/check", () => ({
  runPlatformRulesServerCheck: (...args: Parameters<typeof runPlatformRulesServerCheckMock>) =>
    runPlatformRulesServerCheckMock(...args),
}));
vi.mock("@/lib/domains/rules/rules/platforms/registry", () => ({ farcasterRulesAdapter: {} }));
vi.mock("@/lib/domains/auth/session", () => ({ getSession: () => getSessionMock() }));
vi.mock("@/lib/domains/eligibility/neynar-score", () => ({
  getOrFetchNeynarScore: (...args: Parameters<typeof getOrFetchNeynarScoreMock>) =>
    getOrFetchNeynarScoreMock(...args),
  NEYNAR_ELIGIBILITY_MIN_SCORE: 0.6,
}));
vi.mock("@/lib/domains/rules/cast-rules/normalize", () => ({
  normalizeCastHashRaw: (hash: string) => normalizeCastHashRawMock(hash),
  castHashToBuffer: (hash: string) => castHashToBufferMock(hash),
}));
vi.mock("@/lib/server/db/cobuild-db-client", () => ({ default: farcasterPrismaMock }));
vi.mock("next/cache", () => ({
  revalidateTag: (...args: Parameters<typeof revalidateTagMock>) => revalidateTagMock(...args),
}));

import { checkCastAgainstRule } from "@/lib/domains/rules/cast-rules/actions";

describe("checkCastAgainstRule", () => {
  beforeEach(() => {
    runPlatformRulesServerCheckMock.mockReset();
    getSessionMock.mockReset();
    getOrFetchNeynarScoreMock.mockReset();
    normalizeCastHashRawMock.mockReset();
    castHashToBufferMock.mockReset();
    revalidateTagMock.mockReset();
    farcasterPrismaMock.farcasterCast.findUnique.mockReset();
  });

  it("rejects invalid rule id", async () => {
    normalizeCastHashRawMock.mockReturnValue("0x" + "a".repeat(40));
    const result = await checkCastAgainstRule({ ruleId: 0, castHash: "0xabc" });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid cast hash", async () => {
    normalizeCastHashRawMock.mockReturnValue(null);
    const result = await checkCastAgainstRule({ ruleId: 1, castHash: "bad" });
    expect(result.ok).toBe(false);
  });

  it("requires linked farcaster + address", async () => {
    normalizeCastHashRawMock.mockReturnValue("0x" + "a".repeat(40));
    getSessionMock.mockResolvedValue({ farcaster: null, address: null });

    const result = await checkCastAgainstRule({ ruleId: 1, castHash: "0xabc" });
    expect(result.ok).toBe(false);

    getSessionMock.mockResolvedValue({ farcaster: { fid: 1 }, address: null });
    const result2 = await checkCastAgainstRule({ ruleId: 1, castHash: "0xabc" });
    expect(result2.ok).toBe(false);
  });

  it("blocks low or missing neynar score", async () => {
    normalizeCastHashRawMock.mockReturnValue("0x" + "a".repeat(40));
    getSessionMock.mockResolvedValue({ farcaster: { fid: 1 }, address: "0x" + "1".repeat(40) });

    getOrFetchNeynarScoreMock.mockResolvedValue(null);
    const missing = await checkCastAgainstRule({ ruleId: 1, castHash: "0xabc" });
    expect(missing.ok).toBe(false);

    getOrFetchNeynarScoreMock.mockResolvedValue(0.5);
    const low = await checkCastAgainstRule({ ruleId: 1, castHash: "0xabc" });
    expect(low.ok).toBe(false);

    getOrFetchNeynarScoreMock.mockRejectedValue(new Error("boom"));
    const error = await checkCastAgainstRule({ ruleId: 1, castHash: "0xabc" });
    expect(error.ok).toBe(false);
  });

  it("returns early on rules API errors", async () => {
    normalizeCastHashRawMock.mockReturnValue("0x" + "a".repeat(40));
    getSessionMock.mockResolvedValue({ farcaster: { fid: 1 }, address: "0x" + "1".repeat(40) });
    getOrFetchNeynarScoreMock.mockResolvedValue(0.9);
    runPlatformRulesServerCheckMock.mockResolvedValue({ ok: false, error: "bad" });

    const result = await checkCastAgainstRule({ ruleId: 1, castHash: "0xabc" });
    expect(result.ok).toBe(false);
  });

  it("returns early for post not found outcome", async () => {
    normalizeCastHashRawMock.mockReturnValue("0x" + "a".repeat(40));
    getSessionMock.mockResolvedValue({ farcaster: { fid: 1 }, address: "0x" + "1".repeat(40) });
    getOrFetchNeynarScoreMock.mockResolvedValue(0.9);
    runPlatformRulesServerCheckMock.mockResolvedValue({
      ok: true,
      data: { outcomeCode: "post_not_found" },
    });

    const result = await checkCastAgainstRule({ ruleId: 1, castHash: "0xabc" });
    expect(result.ok).toBe(true);
  });

  it("validates ownership and revalidates on success", async () => {
    normalizeCastHashRawMock.mockReturnValue("0x" + "a".repeat(40));
    getSessionMock.mockResolvedValue({ farcaster: { fid: 2 }, address: "0x" + "1".repeat(40) });
    getOrFetchNeynarScoreMock.mockResolvedValue(0.9);
    runPlatformRulesServerCheckMock.mockResolvedValue({
      ok: true,
      data: { outcomeCode: "passed", rulePassed: true },
    });
    castHashToBufferMock.mockReturnValue(new Uint8Array(20));
    farcasterPrismaMock.farcasterCast.findUnique.mockResolvedValue({ fid: 2n });

    const result = await checkCastAgainstRule({ ruleId: 1, castHash: "0xabc" });
    expect(result.ok).toBe(true);
    expect(revalidateTagMock).toHaveBeenCalled();
  });

  it("handles invalid cast hash buffer and ownership failures", async () => {
    normalizeCastHashRawMock.mockReturnValue("0x" + "a".repeat(40));
    getSessionMock.mockResolvedValue({ farcaster: { fid: 2 }, address: "0x" + "1".repeat(40) });
    getOrFetchNeynarScoreMock.mockResolvedValue(0.9);
    runPlatformRulesServerCheckMock.mockResolvedValue({
      ok: true,
      data: { outcomeCode: "passed", rulePassed: false },
    });

    castHashToBufferMock.mockReturnValue(null);
    const invalidBuffer = await checkCastAgainstRule({ ruleId: 1, castHash: "0xabc" });
    expect(invalidBuffer.ok).toBe(false);

    castHashToBufferMock.mockReturnValue(new Uint8Array(20));
    farcasterPrismaMock.farcasterCast.findUnique.mockResolvedValueOnce(null);
    const missingCast = await checkCastAgainstRule({ ruleId: 1, castHash: "0xabc" });
    expect(missingCast.ok).toBe(false);

    farcasterPrismaMock.farcasterCast.findUnique.mockResolvedValueOnce({ fid: 999n });
    const mismatch = await checkCastAgainstRule({ ruleId: 1, castHash: "0xabc" });
    expect(mismatch.ok).toBe(false);
  });
});
