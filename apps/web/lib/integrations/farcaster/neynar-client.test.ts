import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  NEYNAR_API_BASE,
  getNeynarApiKey,
  getNeynarWalletId,
  neynarFetchUsersByFids,
  neynarGetFreshAccountFid,
  neynarCreateSigner,
  neynarLookupSigner,
  neynarRegisterAccount,
  neynarUpdateUserProfile,
  neynarPublishCast,
  neynarDeleteCast,
  neynarFetchCastByHash,
  neynarResolveCastFromUrl,
  extractScoreFromNeynarUser,
  type NeynarUser,
  type NeynarCast,
} from "./neynar-client";

vi.mock("server-only", () => ({}));

const mockFetchJsonWithTimeout = vi.fn();
vi.mock("@/lib/integrations/http/fetch", () => ({
  fetchJsonWithTimeout: (...args: Parameters<typeof mockFetchJsonWithTimeout>) =>
    mockFetchJsonWithTimeout(...args),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("NEYNAR_API_BASE", () => {
  it("is set to correct URL", () => {
    expect(NEYNAR_API_BASE).toBe("https://api.neynar.com/v2/farcaster");
  });
});

describe("getNeynarApiKey", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns API key when set", () => {
    process.env.NEYNAR_API_KEY = "test-key";
    expect(getNeynarApiKey()).toBe("test-key");
  });

  it("returns undefined when not set", () => {
    delete process.env.NEYNAR_API_KEY;
    expect(getNeynarApiKey()).toBeUndefined();
  });
});

describe("getNeynarWalletId", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns wallet id when set", () => {
    process.env.NEYNAR_WALLET_ID = "wallet-id";
    expect(getNeynarWalletId()).toBe("wallet-id");
  });

  it("returns undefined when not set", () => {
    delete process.env.NEYNAR_WALLET_ID;
    expect(getNeynarWalletId()).toBeUndefined();
  });
});

describe("neynarGetFreshAccountFid", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv, NEYNAR_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  it("returns error when API key missing", async () => {
    delete process.env.NEYNAR_API_KEY;

    const result = await neynarGetFreshAccountFid("wallet-id");

    expect(result).toEqual({ ok: false, error: "Neynar API key not configured." });
    expect(mockFetchJsonWithTimeout).not.toHaveBeenCalled();
  });

  it("returns fid when response is valid", async () => {
    mockFetchJsonWithTimeout.mockResolvedValueOnce({ fid: 123 });

    const result = await neynarGetFreshAccountFid("wallet-id");

    expect(result).toEqual({ ok: true, fid: 123 });
  });

  it("returns error for invalid fid response", async () => {
    mockFetchJsonWithTimeout.mockResolvedValueOnce({ fid: null });

    const result = await neynarGetFreshAccountFid("wallet-id");

    expect(result.ok).toBe(false);
  });

  it("returns error on fetch failure", async () => {
    mockFetchJsonWithTimeout.mockRejectedValueOnce(new Error("boom"));

    const result = await neynarGetFreshAccountFid("wallet-id");

    expect(result).toEqual({ ok: false, error: "boom" });
  });
});

describe("neynarCreateSigner", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv, NEYNAR_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  it("returns error when API key missing", async () => {
    delete process.env.NEYNAR_API_KEY;

    const result = await neynarCreateSigner();

    expect(result).toEqual({ ok: false, error: "Neynar API key not configured." });
  });

  it("returns signer data on success", async () => {
    mockFetchJsonWithTimeout.mockResolvedValueOnce({
      signer_uuid: "uuid",
      public_key: "0xabc",
      permissions: ["WRITE_ALL"],
    });

    const result = await neynarCreateSigner();

    expect(result).toEqual({
      ok: true,
      signerUuid: "uuid",
      publicKey: "0xabc",
      permissions: ["write_all"],
    });
  });

  it("normalizes signer_permissions when permissions are missing", async () => {
    mockFetchJsonWithTimeout.mockResolvedValueOnce({
      signer_uuid: "uuid",
      public_key: "0xabc",
      signer_permissions: ["WRITE_ALL", "WRITE_ALL"],
    });

    const result = await neynarCreateSigner();

    expect(result).toEqual({
      ok: true,
      signerUuid: "uuid",
      publicKey: "0xabc",
      permissions: ["write_all"],
    });
  });

  it("returns error when signer response missing fields", async () => {
    mockFetchJsonWithTimeout.mockResolvedValueOnce({});

    const result = await neynarCreateSigner();

    expect(result.ok).toBe(false);
  });

  it("returns error on fetch failure", async () => {
    const err = Object.assign(new Error("boom"), { status: 503 });
    mockFetchJsonWithTimeout.mockRejectedValueOnce(err);

    const result = await neynarCreateSigner();

    expect(result).toEqual({ ok: false, error: "boom", status: 503 });
  });
});

describe("neynarRegisterAccount", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv, NEYNAR_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  it("returns error when API key missing", async () => {
    delete process.env.NEYNAR_API_KEY;

    const result = await neynarRegisterAccount(
      {
        signature: "0xabc",
        fid: 1,
        requested_user_custody_address: "0x0000000000000000000000000000000000000000",
        deadline: 1,
      },
      "wallet-id"
    );

    expect(result).toEqual({ ok: false, error: "Neynar API key not configured." });
  });

  it("returns ok when register succeeds", async () => {
    mockFetchJsonWithTimeout.mockResolvedValueOnce({});

    const result = await neynarRegisterAccount(
      {
        signature: "0xabc",
        fid: 1,
        requested_user_custody_address: "0x0000000000000000000000000000000000000000",
        deadline: 1,
      },
      "wallet-id"
    );

    expect(result).toEqual({ ok: true });
  });

  it("returns error on register failure", async () => {
    const err = Object.assign(new Error("nope"), { status: 400 });
    mockFetchJsonWithTimeout.mockRejectedValueOnce(err);

    const result = await neynarRegisterAccount(
      {
        signature: "0xabc",
        fid: 1,
        requested_user_custody_address: "0x0000000000000000000000000000000000000000",
        deadline: 1,
      },
      "wallet-id"
    );

    expect(result).toEqual({ ok: false, error: "nope", status: 400 });
  });
});

describe("neynarLookupSigner", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv, NEYNAR_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  it("returns error when API key missing", async () => {
    delete process.env.NEYNAR_API_KEY;

    const result = await neynarLookupSigner("uuid");

    expect(result).toEqual({ ok: false, error: "Neynar API key not configured." });
  });

  it("returns status and permissions from payload", async () => {
    mockFetchJsonWithTimeout.mockResolvedValueOnce({
      result: { status: "approved", signer_permissions: ["WRITE_ALL", "WRITE_ALL"] },
    });

    const result = await neynarLookupSigner("uuid");

    expect(result).toEqual({ ok: true, status: "approved", permissions: ["write_all"] });
  });

  it("returns error when lookup fails", async () => {
    const err = Object.assign(new Error("nope"), { status: 502 });
    mockFetchJsonWithTimeout.mockRejectedValueOnce(err);

    const result = await neynarLookupSigner("uuid");

    expect(result).toEqual({ ok: false, error: "nope", status: 502 });
  });
});

describe("neynarFetchUsersByFids", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv, NEYNAR_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  it("returns empty array when API key is not set", async () => {
    delete process.env.NEYNAR_API_KEY;

    const result = await neynarFetchUsersByFids([123]);

    expect(result).toEqual([]);
    expect(mockFetchJsonWithTimeout).not.toHaveBeenCalled();
  });

  it("returns empty array when fids array is empty", async () => {
    const result = await neynarFetchUsersByFids([]);

    expect(result).toEqual([]);
    expect(mockFetchJsonWithTimeout).not.toHaveBeenCalled();
  });

  it("filters invalid fids", async () => {
    mockFetchJsonWithTimeout.mockResolvedValueOnce({ users: [] });

    await neynarFetchUsersByFids([0, -1, NaN, Infinity, 123]);

    expect(mockFetchJsonWithTimeout).toHaveBeenCalledWith(
      "https://api.neynar.com/v2/farcaster/user/bulk/?fids=123",
      expect.any(Object)
    );
  });

  it("deduplicates fids", async () => {
    mockFetchJsonWithTimeout.mockResolvedValueOnce({ users: [] });

    await neynarFetchUsersByFids([123, 456, 123, 456]);

    expect(mockFetchJsonWithTimeout).toHaveBeenCalledWith(
      expect.stringContaining("fids="),
      expect.any(Object)
    );
    const url = mockFetchJsonWithTimeout.mock.calls[0][0] as string;
    const fidsParam = url.split("fids=")[1];
    const fids = fidsParam.split(",");
    expect(fids).toHaveLength(2);
  });

  it("returns users from API", async () => {
    const mockUsers: NeynarUser[] = [
      { fid: 123, username: "alice" },
      { fid: 456, username: "bob" },
    ];
    mockFetchJsonWithTimeout.mockResolvedValueOnce({ users: mockUsers });

    const result = await neynarFetchUsersByFids([123, 456]);

    expect(result).toEqual(mockUsers);
  });

  it("returns empty array when API response has no users", async () => {
    mockFetchJsonWithTimeout.mockResolvedValueOnce({});

    const result = await neynarFetchUsersByFids([123]);

    expect(result).toEqual([]);
  });

  it("returns empty array on fetch error", async () => {
    mockFetchJsonWithTimeout.mockRejectedValueOnce(new Error("Network error"));

    const result = await neynarFetchUsersByFids([123]);

    expect(result).toEqual([]);
  });

  it("passes correct headers to API", async () => {
    mockFetchJsonWithTimeout.mockResolvedValueOnce({ users: [] });

    await neynarFetchUsersByFids([123]);

    expect(mockFetchJsonWithTimeout).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { "x-api-key": "test-api-key" },
      })
    );
  });
});

describe("neynarResolveCastFromUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv, NEYNAR_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  it("returns error when API key is not set", async () => {
    delete process.env.NEYNAR_API_KEY;

    const result = await neynarResolveCastFromUrl("https://warpcast.com/user/0x123");

    expect(result).toEqual({
      ok: false,
      error: "Neynar API key not configured.",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns cast hash on successful resolution", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          cast: { hash: "0x1234567890123456789012345678901234567890" },
        }),
    });

    const result = await neynarResolveCastFromUrl("https://warpcast.com/user/0x123");

    expect(result).toEqual({
      ok: true,
      hash: "0x1234567890123456789012345678901234567890",
    });
  });

  it("returns error for 404 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await neynarResolveCastFromUrl("https://warpcast.com/user/0x123");

    expect(result).toEqual({ ok: false, error: "Cast not found." });
  });

  it("returns error for other HTTP errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await neynarResolveCastFromUrl("https://warpcast.com/user/0x123");

    expect(result).toEqual({ ok: false, error: "Neynar API error: 500" });
  });

  it("returns error when cast hash is missing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ cast: {} }),
    });

    const result = await neynarResolveCastFromUrl("https://warpcast.com/user/0x123");

    expect(result).toEqual({
      ok: false,
      error: "Could not resolve cast hash from URL.",
    });
  });

  it("returns error when cast hash format is invalid", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ cast: { hash: "invalid-hash" } }),
    });

    const result = await neynarResolveCastFromUrl("https://warpcast.com/user/0x123");

    expect(result).toEqual({
      ok: false,
      error: "Could not resolve cast hash from URL.",
    });
  });

  it("returns error on fetch exception", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    const result = await neynarResolveCastFromUrl("https://warpcast.com/user/0x123");

    expect(result).toEqual({ ok: false, error: "Network failure" });
  });

  it("encodes URL parameter correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          cast: { hash: "0x1234567890123456789012345678901234567890" },
        }),
    });

    await neynarResolveCastFromUrl("https://warpcast.com/user/0x123?foo=bar");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent("https://warpcast.com/user/0x123?foo=bar")),
      expect.any(Object)
    );
  });
});

describe("neynarUpdateUserProfile", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv, NEYNAR_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  it("returns error when API key is not set", async () => {
    delete process.env.NEYNAR_API_KEY;

    const result = await neynarUpdateUserProfile({ signerUuid: "uuid" });

    expect(result).toEqual({ ok: false, error: "Neynar API key not configured." });
  });

  it("updates profile with display name and pfp", async () => {
    mockFetchJsonWithTimeout.mockResolvedValueOnce({});

    const result = await neynarUpdateUserProfile({
      signerUuid: "uuid",
      displayName: "Test",
      pfpUrl: "https://example.com/avatar.png",
    });

    expect(result).toEqual({ ok: true });
    const init = mockFetchJsonWithTimeout.mock.calls[0]?.[1] as { body?: string };
    expect(JSON.parse(init.body ?? "{}")).toEqual({
      signer_uuid: "uuid",
      display_name: "Test",
      pfp_url: "https://example.com/avatar.png",
    });
  });

  it("returns error when update fails", async () => {
    const err = Object.assign(new Error("fail"), { status: 500 });
    mockFetchJsonWithTimeout.mockRejectedValueOnce(err);

    const result = await neynarUpdateUserProfile({ signerUuid: "uuid" });

    expect(result).toEqual({ ok: false, error: "fail", status: 500 });
  });
});

describe("neynarPublishCast", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv, NEYNAR_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  it("returns error when API key is not set", async () => {
    delete process.env.NEYNAR_API_KEY;

    const result = await neynarPublishCast({ signerUuid: "uuid", text: "hello" });

    expect(result).toEqual({ ok: false, error: "Neynar API key not configured." });
    expect(mockFetchJsonWithTimeout).not.toHaveBeenCalled();
  });

  it("posts payload and returns hash on success", async () => {
    const hash = `0x${"a".repeat(40)}`;
    const parentHash = `0x${"b".repeat(40)}`;
    const embedUrl = "https://example.com/image.png";
    mockFetchJsonWithTimeout.mockResolvedValueOnce({
      success: true,
      cast: { hash },
    });

    const result = await neynarPublishCast({
      signerUuid: "uuid",
      text: "hello",
      parentHash,
      parentAuthorFid: 123,
      idem: "idemkey",
      embeds: [{ url: embedUrl }],
    });

    expect(result).toEqual({ ok: true, hash, cast: { hash } });
    expect(mockFetchJsonWithTimeout).toHaveBeenCalledWith(
      "https://api.neynar.com/v2/farcaster/cast/",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-api-key": "test-api-key" }),
      })
    );
    const init = mockFetchJsonWithTimeout.mock.calls[0]?.[1] as { body?: string };
    expect(JSON.parse(init.body ?? "{}")).toEqual({
      signer_uuid: "uuid",
      text: "hello",
      parent: parentHash,
      parent_author_fid: 123,
      idem: "idemkey",
      embeds: [{ url: embedUrl }],
    });
  });

  it("returns error for unexpected response", async () => {
    mockFetchJsonWithTimeout.mockResolvedValueOnce({ success: false });

    const result = await neynarPublishCast({ signerUuid: "uuid", text: "hello" });

    expect(result).toEqual({ ok: false, error: "Unexpected response from Neynar API." });
  });

  it("returns error on fetch failure", async () => {
    const error = Object.assign(new Error("boom"), { status: 500 });
    mockFetchJsonWithTimeout.mockRejectedValueOnce(error);

    const result = await neynarPublishCast({ signerUuid: "uuid", text: "hello" });

    expect(result).toEqual({ ok: false, error: "boom", status: 500 });
  });
});

describe("neynarDeleteCast", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv, NEYNAR_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  it("returns error when API key is not set", async () => {
    delete process.env.NEYNAR_API_KEY;

    const result = await neynarDeleteCast({ signerUuid: "uuid", castHash: "0xabc" });

    expect(result).toEqual({ ok: false, error: "Neynar API key not configured." });
    expect(mockFetchJsonWithTimeout).not.toHaveBeenCalled();
  });

  it("returns error for invalid cast hash", async () => {
    const result = await neynarDeleteCast({ signerUuid: "uuid", castHash: "bad-hash" });

    expect(result).toEqual({ ok: false, error: "Invalid cast hash." });
    expect(mockFetchJsonWithTimeout).not.toHaveBeenCalled();
  });

  it("returns ok on success", async () => {
    mockFetchJsonWithTimeout.mockResolvedValueOnce({ success: true });

    const result = await neynarDeleteCast({
      signerUuid: "uuid",
      castHash: "0x" + "a".repeat(40),
    });

    expect(result).toEqual({ ok: true });
  });

  it("returns ok when cast already deleted", async () => {
    const error = Object.assign(new Error("cast not found or already deleted"), { status: 404 });
    mockFetchJsonWithTimeout.mockRejectedValueOnce(error);

    const result = await neynarDeleteCast({
      signerUuid: "uuid",
      castHash: "0x" + "b".repeat(40),
    });

    expect(result).toEqual({ ok: true });
  });

  it("returns error when API responds with failure", async () => {
    mockFetchJsonWithTimeout.mockResolvedValueOnce({ success: false, message: "nope" });

    const result = await neynarDeleteCast({
      signerUuid: "uuid",
      castHash: "0x" + "c".repeat(40),
    });

    expect(result).toEqual({ ok: false, error: "nope" });
  });

  it("returns fallback error when API response is missing a message", async () => {
    mockFetchJsonWithTimeout.mockResolvedValueOnce({ success: false });

    const result = await neynarDeleteCast({
      signerUuid: "uuid",
      castHash: "0x" + "d".repeat(40),
    });

    expect(result).toEqual({ ok: false, error: "Unexpected response from Neynar API." });
  });
});

describe("neynarFetchCastByHash", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv, NEYNAR_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  it("returns error when API key is not set", async () => {
    delete process.env.NEYNAR_API_KEY;

    const result = await neynarFetchCastByHash("0x" + "a".repeat(40));

    expect(result).toEqual({ ok: false, error: "Neynar API key not configured." });
    expect(mockFetchJsonWithTimeout).not.toHaveBeenCalled();
  });

  it("rejects invalid hashes", async () => {
    const result = await neynarFetchCastByHash("bad-hash");

    expect(result).toEqual({ ok: false, error: "Invalid cast hash." });
    expect(mockFetchJsonWithTimeout).not.toHaveBeenCalled();
  });

  it("returns cast when payload is valid", async () => {
    const hash = "0x" + "a".repeat(40);
    const cast: NeynarCast = {
      hash,
      text: "hello",
      timestamp: new Date().toISOString(),
      parent_hash: null,
      parent_url: null,
      root_parent_url: "https://farcaster.xyz/~/channel/cobuild",
      thread_hash: hash,
      author: { fid: 123 },
    };
    mockFetchJsonWithTimeout.mockResolvedValueOnce({ cast });

    const result = await neynarFetchCastByHash(hash.slice(2));

    expect(result).toEqual({ ok: true, cast });
    expect(mockFetchJsonWithTimeout).toHaveBeenCalledWith(
      `${NEYNAR_API_BASE}/cast?identifier=${encodeURIComponent(hash)}&type=hash`,
      expect.objectContaining({
        headers: expect.objectContaining({ "x-api-key": "test-api-key" }),
      })
    );
  });

  it("returns deleted when cast is flagged deleted", async () => {
    const hash = "0x" + "b".repeat(40);
    const cast: NeynarCast = {
      hash,
      text: "hello",
      timestamp: new Date().toISOString(),
      parent_hash: null,
      parent_url: null,
      root_parent_url: "https://farcaster.xyz/~/channel/cobuild",
      thread_hash: hash,
      author: { fid: 123 },
      deleted: true,
    };
    mockFetchJsonWithTimeout.mockResolvedValueOnce({ cast });

    const result = await neynarFetchCastByHash(hash);

    expect(result).toEqual({ ok: false, error: "Cast deleted.", deleted: true });
  });

  it("returns deleted when cast has deleted_at", async () => {
    const hash = "0x" + "d".repeat(40);
    const cast: NeynarCast = {
      hash,
      text: "hello",
      timestamp: new Date().toISOString(),
      parent_hash: null,
      parent_url: null,
      root_parent_url: "https://farcaster.xyz/~/channel/cobuild",
      thread_hash: hash,
      author: { fid: 123 },
      deleted_at: new Date().toISOString(),
    };
    mockFetchJsonWithTimeout.mockResolvedValueOnce({ cast });

    const result = await neynarFetchCastByHash(hash);

    expect(result).toEqual({ ok: false, error: "Cast deleted.", deleted: true });
  });

  it("returns notFound when cast is missing", async () => {
    mockFetchJsonWithTimeout.mockResolvedValueOnce({ cast: null });

    const result = await neynarFetchCastByHash("0x" + "e".repeat(40));

    expect(result).toEqual({ ok: false, error: "Cast not found.", notFound: true });
  });

  it("returns notFound on 404 errors", async () => {
    const error = Object.assign(new Error("not found"), { status: 404 });
    mockFetchJsonWithTimeout.mockRejectedValueOnce(error);

    const result = await neynarFetchCastByHash("0x" + "c".repeat(40));

    expect(result).toEqual({ ok: false, error: "Cast not found.", status: 404, notFound: true });
  });

  it("returns notFound on 410 errors", async () => {
    const error = Object.assign(new Error("gone"), { status: 410 });
    mockFetchJsonWithTimeout.mockRejectedValueOnce(error);

    const result = await neynarFetchCastByHash("0x" + "f".repeat(40));

    expect(result).toEqual({ ok: false, error: "Cast not found.", status: 410, notFound: true });
  });

  it("returns fallback error for unknown failures", async () => {
    const error = Object.assign(new Error(""), { status: 500 });
    mockFetchJsonWithTimeout.mockRejectedValueOnce(error);

    const result = await neynarFetchCastByHash("0x" + "a".repeat(40));

    expect(result).toEqual({
      ok: false,
      error: "Failed to fetch cast.",
      status: 500,
    });
  });
});

describe("extractScoreFromNeynarUser", () => {
  it("returns null for undefined user", () => {
    expect(extractScoreFromNeynarUser(undefined)).toBeNull();
  });

  it("returns experimental score when present", () => {
    const user: NeynarUser = {
      fid: 123,
      experimental: { neynar_user_score: 0.75 },
    };

    expect(extractScoreFromNeynarUser(user)).toBe(0.75);
  });

  it("falls back to top-level score when experimental is missing", () => {
    const user: NeynarUser = {
      fid: 123,
      score: 0.65,
    };

    expect(extractScoreFromNeynarUser(user)).toBe(0.65);
  });

  it("prefers experimental score over top-level score", () => {
    const user: NeynarUser = {
      fid: 123,
      score: 0.5,
      experimental: { neynar_user_score: 0.9 },
    };

    expect(extractScoreFromNeynarUser(user)).toBe(0.9);
  });

  it("returns null when experimental score is not a number", () => {
    const user: NeynarUser = {
      fid: 123,
      experimental: { neynar_user_score: Number("not-a-number") },
    };

    expect(extractScoreFromNeynarUser(user)).toBeNull();
  });

  it("returns null when score is NaN", () => {
    const user: NeynarUser = {
      fid: 123,
      score: NaN,
    };

    expect(extractScoreFromNeynarUser(user)).toBeNull();
  });

  it("returns null when no scores are present", () => {
    const user: NeynarUser = {
      fid: 123,
    };

    expect(extractScoreFromNeynarUser(user)).toBeNull();
  });

  it("handles score of 0", () => {
    const user: NeynarUser = {
      fid: 123,
      experimental: { neynar_user_score: 0 },
    };

    expect(extractScoreFromNeynarUser(user)).toBe(0);
  });

  it("handles score of 1", () => {
    const user: NeynarUser = {
      fid: 123,
      experimental: { neynar_user_score: 1 },
    };

    expect(extractScoreFromNeynarUser(user)).toBe(1);
  });
});
