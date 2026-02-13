import { describe, expect, it, vi, beforeEach } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";

vi.mock("server-only", () => ({}));

const { unstableCacheMock, neynarLookupSignerMock } = vi.hoisted(() => ({
  unstableCacheMock: vi.fn(),
  neynarLookupSignerMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheMock,
}));

vi.mock("@/lib/integrations/farcaster/neynar-client", () => ({
  neynarLookupSigner: (...args: Parameters<typeof neynarLookupSignerMock>) =>
    neynarLookupSignerMock(...args),
}));

import {
  getCachedNeynarSignerStatus,
  getSignerStatusCacheTag,
  getSignerStatusUuidCacheTag,
} from "./signer-status";

describe("signer-status", () => {
  beforeEach(() => {
    const passthroughCache: typeof unstableCache = (fn, _keyParts, _options) => fn;
    unstableCacheMock.mockImplementation(passthroughCache);
    neynarLookupSignerMock.mockReset();
    unstableCacheMock.mockClear();
  });

  it("builds cache tags", () => {
    expect(getSignerStatusCacheTag(123)).toBe("neynar-signer:123");
    expect(getSignerStatusUuidCacheTag("uuid-123")).toBe("neynar-signer:uuid:uuid-123");
  });

  it("caches signer status with fid tag when valid", async () => {
    neynarLookupSignerMock.mockResolvedValue({
      ok: true,
      status: "approved",
      permissions: ["write_all"],
    });

    const result = await getCachedNeynarSignerStatus("uuid-123", 123);

    expect(result).toEqual({ ok: true, status: "approved", permissions: ["write_all"] });
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["neynar-signer-status", "uuid-123", "123"],
      { tags: ["neynar-signer:uuid:uuid-123", "neynar-signer:123"], revalidate: 60 }
    );
  });

  it("omits fid tag when fid is invalid", async () => {
    neynarLookupSignerMock.mockResolvedValue({ ok: false, error: "boom" });

    const result = await getCachedNeynarSignerStatus("uuid-999", 0);

    expect(result).toEqual({ ok: false, error: "boom" });
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["neynar-signer-status", "uuid-999", "unknown"],
      { tags: ["neynar-signer:uuid:uuid-999"], revalidate: 60 }
    );
  });
});
