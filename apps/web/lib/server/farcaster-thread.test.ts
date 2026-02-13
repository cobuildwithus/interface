import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  getSession,
  upsertCobuildCastByHash,
  neynarPublishCast,
  getSignerRecord,
  hasCastPermission,
  revalidateTag,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  upsertCobuildCastByHash: vi.fn(),
  neynarPublishCast: vi.fn(),
  getSignerRecord: vi.fn(),
  hasCastPermission: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidateTag }));
vi.mock("@/lib/domains/auth/session", () => ({ getSession }));
vi.mock("@/lib/integrations/farcaster/casts/upsert", () => ({ upsertCobuildCastByHash }));
vi.mock("@/lib/integrations/farcaster/neynar-client", () => ({ neynarPublishCast }));
vi.mock("@/lib/integrations/farcaster/signer-store", () => ({ getSignerRecord }));
vi.mock("@/lib/integrations/farcaster/signer-utils", () => ({ hasCastPermission }));
vi.mock("@/lib/integrations/farcaster/casts/shared", () => ({
  COBUILD_CHANNEL_URL: "cobuild-url",
  DISCUSSION_CACHE_TAG: "discussion",
  THREAD_CACHE_TAG: "thread",
}));
vi.mock("@/lib/server/farcaster-post-utils", async () => {
  const actual =
    await vi.importActual<typeof import("./farcaster-post-utils")>("./farcaster-post-utils");
  return {
    ...actual,
    buildIdemKey: vi.fn(() => "idem-key"),
  };
});

import { createThreadPost } from "./farcaster-thread";

describe("createThreadPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a title", async () => {
    const result = await createThreadPost({ content: "hello" });
    expect(result).toEqual({ ok: false, status: 400, error: "Title is required." });
  });

  it("requires content", async () => {
    const result = await createThreadPost({ title: "hello" });
    expect(result).toEqual({ ok: false, status: 400, error: "Content is required." });
  });

  it("rejects invalid attachment urls", async () => {
    const result = await createThreadPost({
      title: "hello",
      content: "world",
      attachmentUrls: ["not-a-url"],
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Invalid attachment URLs.",
    });
  });

  it("rejects invalid attachment url", async () => {
    const result = await createThreadPost({
      title: "hello",
      content: "world",
      attachmentUrl: "not-a-url",
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Invalid attachment URL.",
    });
  });

  it("rejects invalid embed url", async () => {
    const result = await createThreadPost({
      title: "hello",
      content: "world",
      embedUrl: "not-a-url",
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Invalid embed URL.",
    });
  });

  it("rejects too many attachments", async () => {
    const result = await createThreadPost({
      title: "hello",
      content: "world",
      attachmentUrls: ["https://a.com", "https://b.com"],
      embedUrl: "https://c.com",
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Too many attachments. Goal posts support 1 image (plus the goal link).",
    });
  });

  it("rejects more than two attachments without embed", async () => {
    const result = await createThreadPost({
      title: "hello",
      content: "world",
      attachmentUrls: ["https://a.com", "https://b.com", "https://c.com"],
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Too many attachments. You can attach up to 2 images.",
    });
  });

  it("rejects overly long posts", async () => {
    const result = await createThreadPost({
      title: "hello",
      content: "a".repeat(10240),
    });
    expect(result).toEqual({ ok: false, status: 400, error: "Post is too long." });
  });

  it("requires a connected farcaster session", async () => {
    getSession.mockResolvedValueOnce({});
    const result = await createThreadPost({ title: "hello", content: "world" });
    expect(result).toEqual({
      ok: false,
      status: 401,
      error: "Connect a Farcaster account to post.",
    });
  });

  it("requires signer record", async () => {
    getSession.mockResolvedValueOnce({ farcaster: { fid: 10 } });
    getSignerRecord.mockResolvedValueOnce(null);
    const result = await createThreadPost({ title: "hello", content: "world" });
    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Farcaster signer not connected.",
    });
  });

  it("requires cast permission", async () => {
    getSession.mockResolvedValueOnce({ farcaster: { fid: 10 } });
    getSignerRecord.mockResolvedValueOnce({ signerPermissions: [] });
    hasCastPermission.mockReturnValueOnce(false);
    const result = await createThreadPost({ title: "hello", content: "world" });
    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Farcaster signer missing cast permission.",
    });
  });

  it("returns errors when publish fails", async () => {
    getSession.mockResolvedValueOnce({ farcaster: { fid: 10 } });
    getSignerRecord.mockResolvedValueOnce({ signerPermissions: ["cast"], signerUuid: "uuid" });
    hasCastPermission.mockReturnValueOnce(true);
    neynarPublishCast.mockResolvedValueOnce({ ok: false, status: 500, error: "fail" });

    const result = await createThreadPost({ title: "hello", content: "world" });
    expect(result).toEqual({ ok: false, status: 500, error: "fail" });
  });

  it("de-dupes embed urls that match attachments", async () => {
    getSession.mockResolvedValueOnce({ farcaster: { fid: 10 } });
    getSignerRecord.mockResolvedValueOnce({ signerPermissions: ["cast"], signerUuid: "uuid" });
    hasCastPermission.mockReturnValueOnce(true);
    neynarPublishCast.mockResolvedValueOnce({ ok: true, hash: "hash-1" });
    upsertCobuildCastByHash.mockResolvedValue(true);

    const result = await createThreadPost({
      title: "hello",
      content: "world",
      attachmentUrls: ["https://a.com"],
      embedUrl: "https://a.com",
    });

    expect(neynarPublishCast).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [{ url: "https://a.com" }],
      })
    );
    expect(result).toEqual({ ok: true, data: { hash: "hash-1" } });
  });

  it("publishes multi-chunk threads and revalidates", async () => {
    vi.useFakeTimers();
    getSession.mockResolvedValueOnce({ farcaster: { fid: 10 } });
    getSignerRecord.mockResolvedValueOnce({ signerPermissions: ["cast"], signerUuid: "uuid" });
    hasCastPermission.mockReturnValueOnce(true);
    let call = 0;
    neynarPublishCast.mockImplementation(async () => ({ ok: true, hash: `hash-${++call}` }));
    upsertCobuildCastByHash.mockResolvedValue(true);

    const promise = createThreadPost({
      title: "hello",
      content: "a".repeat(2500),
      attachmentUrl: "https://a.com",
    });

    await vi.runAllTimersAsync();
    const result = await promise;
    vi.useRealTimers();

    expect(neynarPublishCast.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(neynarPublishCast).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        parentHash: "cobuild-url",
        signerUuid: "uuid",
        embeds: [{ url: "https://a.com" }],
      })
    );
    expect(neynarPublishCast).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        parentHash: "hash-1",
        parentAuthorFid: 10,
        signerUuid: "uuid",
      })
    );
    expect(upsertCobuildCastByHash).toHaveBeenCalledWith("hash-1");
    expect(revalidateTag).toHaveBeenCalled();
    expect(result).toEqual({ ok: true, data: { hash: "hash-1" } });
  });
});
