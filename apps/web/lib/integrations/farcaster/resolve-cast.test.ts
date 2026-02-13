import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { resolveCastHashFromUrl } from "./resolve-cast";

vi.mock("server-only", () => ({}));

const mockNeynarResolveCastFromUrl = vi.fn();
const mockExtractFullHashFromUrl = vi.fn();

vi.mock("./neynar-client", () => ({
  neynarResolveCastFromUrl: (...args: Parameters<typeof mockNeynarResolveCastFromUrl>) =>
    mockNeynarResolveCastFromUrl(...args),
}));

vi.mock("./parse-cast-url", () => ({
  extractFullHashFromUrl: (...args: Parameters<typeof mockExtractFullHashFromUrl>) =>
    mockExtractFullHashFromUrl(...args),
}));

describe("resolveCastHashFromUrl", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns hash directly when extractFullHashFromUrl succeeds", async () => {
    const fullHash = "0x1234567890123456789012345678901234567890";
    mockExtractFullHashFromUrl.mockReturnValueOnce(fullHash);

    const result = await resolveCastHashFromUrl(
      "https://farcaster.xyz/user/0x1234567890123456789012345678901234567890"
    );

    expect(result).toEqual({ ok: true, hash: fullHash });
    expect(mockNeynarResolveCastFromUrl).not.toHaveBeenCalled();
  });

  it("falls back to neynar API when URL contains short hash", async () => {
    const fullHash = "0x1234567890123456789012345678901234567890";
    mockExtractFullHashFromUrl.mockReturnValueOnce(null);
    mockNeynarResolveCastFromUrl.mockResolvedValueOnce({
      ok: true,
      hash: fullHash,
    });

    const result = await resolveCastHashFromUrl("https://farcaster.xyz/user/0x123456");

    expect(result).toEqual({ ok: true, hash: fullHash });
    expect(mockNeynarResolveCastFromUrl).toHaveBeenCalledWith(
      "https://farcaster.xyz/user/0x123456"
    );
  });

  it("returns error when neynar API fails", async () => {
    mockExtractFullHashFromUrl.mockReturnValueOnce(null);
    mockNeynarResolveCastFromUrl.mockResolvedValueOnce({
      ok: false,
      error: "Cast not found.",
    });

    const result = await resolveCastHashFromUrl("https://farcaster.xyz/user/0x123456");

    expect(result).toEqual({ ok: false, error: "Cast not found." });
  });

  it("returns error when API key not configured", async () => {
    mockExtractFullHashFromUrl.mockReturnValueOnce(null);
    mockNeynarResolveCastFromUrl.mockResolvedValueOnce({
      ok: false,
      error: "Neynar API key not configured.",
    });

    const result = await resolveCastHashFromUrl("https://farcaster.xyz/user/0x123456");

    expect(result).toEqual({ ok: false, error: "Neynar API key not configured." });
  });

  it("passes URL to extractFullHashFromUrl for parsing", async () => {
    const testUrl =
      "https://farcaster.xyz/~/conversations/0x1234567890123456789012345678901234567890";
    mockExtractFullHashFromUrl.mockReturnValueOnce("0x1234567890123456789012345678901234567890");

    await resolveCastHashFromUrl(testUrl);

    expect(mockExtractFullHashFromUrl).toHaveBeenCalledWith(testUrl);
  });
});
