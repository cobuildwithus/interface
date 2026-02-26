import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  getSession,
  upsertCobuildCastByHash,
  neynarPublishCast,
  isFullCastHash,
  getSignerRecord,
  hasCastPermission,
  normalizeFid,
  revalidateTag,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  upsertCobuildCastByHash: vi.fn(),
  neynarPublishCast: vi.fn(),
  isFullCastHash: vi.fn(),
  getSignerRecord: vi.fn(),
  hasCastPermission: vi.fn(),
  normalizeFid: vi.fn(),
  revalidateTag: vi.fn(),
}));

const { buildIdemKey } = vi.hoisted(() => ({
  buildIdemKey: vi.fn(() => "idem-key"),
}));

vi.mock("next/cache", () => ({ revalidateTag }));
vi.mock("@/lib/domains/auth/session", () => ({ getSession }));
vi.mock("@/lib/integrations/farcaster/casts/upsert", () => ({ upsertCobuildCastByHash }));
vi.mock("@/lib/integrations/farcaster/neynar-client", () => ({ neynarPublishCast }));
vi.mock("@/lib/integrations/farcaster/parse-cast-url", () => ({ isFullCastHash }));
vi.mock("@/lib/integrations/farcaster/signer-store", () => ({ getSignerRecord }));
vi.mock("@/lib/integrations/farcaster/signer-utils", () => ({
  hasCastPermission,
  normalizeFid,
}));
vi.mock("@/lib/server/farcaster-post-utils", () => ({
  buildIdemKey,
  normalizeOptionalUrl: (value: string | null | undefined) =>
    typeof value === "string" ? value : null,
}));

import { createReplyPost } from "./farcaster-reply";

describe("createReplyPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires text", async () => {
    const result = await createReplyPost({});
    expect(result).toEqual({ ok: false, status: 400, error: "Reply text is required." });
  });

  it("rejects long text", async () => {
    const result = await createReplyPost({ text: "a".repeat(1025) });
    expect(result).toEqual({ ok: false, status: 400, error: "Reply is too long." });
  });

  it("rejects invalid parent hash", async () => {
    isFullCastHash.mockReturnValueOnce(false);
    const result = await createReplyPost({ text: "hi", parentHash: "bad" });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Invalid parent cast hash.",
    });
  });

  it("rejects invalid parent author fid", async () => {
    isFullCastHash.mockReturnValueOnce(true);
    normalizeFid.mockReturnValueOnce(null);
    const result = await createReplyPost({
      text: "hi",
      parentHash: "0x" + "a".repeat(40),
      parentAuthorFid: "bad",
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Invalid parent author fid.",
    });
  });

  it("rejects invalid attachment URL", async () => {
    isFullCastHash.mockReturnValueOnce(true);
    normalizeFid.mockReturnValueOnce(1);
    const result = await createReplyPost({
      text: "hi",
      parentHash: "0x" + "a".repeat(40),
      parentAuthorFid: 1,
      attachmentUrl: 123,
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Invalid attachment URL.",
    });
  });

  it("requires a connected farcaster session", async () => {
    isFullCastHash.mockReturnValueOnce(true);
    getSession.mockResolvedValueOnce({});
    const result = await createReplyPost({
      text: "hi",
      parentHash: "0x" + "a".repeat(40),
    });
    expect(result).toEqual({
      ok: false,
      status: 401,
      error: "Connect a Farcaster account to post replies.",
    });
  });

  it("requires signer record", async () => {
    isFullCastHash.mockReturnValueOnce(true);
    getSession.mockResolvedValueOnce({ farcaster: { fid: 7 } });
    getSignerRecord.mockResolvedValueOnce(null);

    const result = await createReplyPost({
      text: "hi",
      parentHash: "0x" + "a".repeat(40),
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Farcaster signer not connected.",
    });
  });

  it("requires cast permission", async () => {
    isFullCastHash.mockReturnValueOnce(true);
    getSession.mockResolvedValueOnce({ farcaster: { fid: 7 } });
    getSignerRecord.mockResolvedValueOnce({ signerPermissions: [] });
    hasCastPermission.mockReturnValueOnce(false);

    const result = await createReplyPost({
      text: "hi",
      parentHash: "0x" + "a".repeat(40),
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Farcaster signer missing cast permission.",
    });
  });

  it("returns publish errors", async () => {
    isFullCastHash.mockReturnValueOnce(true);
    getSession.mockResolvedValueOnce({ farcaster: { fid: 7 } });
    getSignerRecord.mockResolvedValueOnce({ signerPermissions: ["cast"], signerUuid: "uuid" });
    hasCastPermission.mockReturnValueOnce(true);
    neynarPublishCast.mockResolvedValueOnce({ ok: false, status: 500, error: "fail" });

    const result = await createReplyPost({
      text: "hi",
      parentHash: "0x" + "a".repeat(40),
    });

    expect(result).toEqual({ ok: false, status: 500, error: "fail" });
  });

  it("publishes and revalidates on success", async () => {
    isFullCastHash.mockReturnValueOnce(true);
    getSession.mockResolvedValueOnce({ farcaster: { fid: 7 } });
    getSignerRecord.mockResolvedValueOnce({ signerPermissions: ["cast"], signerUuid: "uuid" });
    hasCastPermission.mockReturnValueOnce(true);
    neynarPublishCast.mockResolvedValueOnce({ ok: true, hash: "0xhash" });
    upsertCobuildCastByHash.mockResolvedValueOnce(true);

    const result = await createReplyPost({
      text: "hi",
      parentHash: "0x" + "a".repeat(40),
      attachmentUrl: "https://example.com/image.png",
    });

    expect(neynarPublishCast).toHaveBeenCalledWith(
      expect.objectContaining({
        signerUuid: "uuid",
        text: "hi",
        parentHash: "0x" + "a".repeat(40),
        idem: "idem-key",
        embeds: [{ url: "https://example.com/image.png" }],
      })
    );
    expect(upsertCobuildCastByHash).toHaveBeenCalledWith("0xhash");
    expect(revalidateTag).toHaveBeenCalled();
    expect(result).toEqual({ ok: true, data: { hash: "0xhash" } });
  });
});
