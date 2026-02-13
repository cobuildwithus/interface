import { beforeEach, describe, expect, it, vi } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";

const prismaMock = vi.hoisted(() => {
  const linkedSocialAccount = {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  };

  return {
    linkedSocialAccount,
    $primary: vi.fn(() => ({ linkedSocialAccount })),
  };
});

const revalidateTagMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
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
  revalidateTag: revalidateTagMock,
}));

import { getLinkedAccountsByAddress, upsertLinkedAccount } from "./store";

describe("linked accounts store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a linked account when none exists", async () => {
    prismaMock.linkedSocialAccount.findUnique.mockResolvedValueOnce(null);
    prismaMock.linkedSocialAccount.create.mockResolvedValueOnce({
      platform: "farcaster",
      platformId: "1",
      username: "alice",
      displayName: "Alice",
      avatarUrl: null,
      source: "privy",
      canPost: false,
      updatedAt: new Date("2024-01-01T00:00:00Z"),
    });

    const result = await upsertLinkedAccount({
      ownerAddress: "0x" + "a".repeat(40),
      platform: "farcaster",
      platformId: "1",
      username: "alice",
      displayName: "Alice",
      avatarUrl: null,
      source: "privy",
    });

    expect(prismaMock.linkedSocialAccount.create).toHaveBeenCalled();
    expect(revalidateTagMock).toHaveBeenCalled();
    expect(result.platform).toBe("farcaster");
  });

  it("updates existing account and preserves posting capability", async () => {
    prismaMock.linkedSocialAccount.findUnique.mockResolvedValueOnce({
      id: 1,
      ownerAddress: "0x" + "a".repeat(40),
      platform: "farcaster",
      platformId: "1",
      username: "alice",
      displayName: "Alice",
      avatarUrl: "https://pfp",
      source: "neynar_signer",
      canPost: true,
    });
    prismaMock.linkedSocialAccount.update.mockResolvedValueOnce({
      platform: "farcaster",
      platformId: "1",
      username: "alice",
      displayName: "Alice",
      avatarUrl: "https://pfp",
      source: "neynar_signer",
      canPost: true,
      updatedAt: new Date("2024-01-02T00:00:00Z"),
    });

    const result = await upsertLinkedAccount({
      ownerAddress: "0x" + "a".repeat(40),
      platform: "farcaster",
      platformId: "1",
      username: null,
      displayName: null,
      avatarUrl: null,
      source: "privy",
      canPost: false,
    });

    expect(prismaMock.linkedSocialAccount.update).toHaveBeenCalled();
    expect(result.canPost).toBe(true);
    expect(result.source).toBe("neynar_signer");
  });

  it("returns cached linked accounts by address", async () => {
    prismaMock.linkedSocialAccount.findMany.mockResolvedValueOnce([
      {
        platform: "x",
        platformId: "123",
        username: "alice",
        displayName: "Alice",
        avatarUrl: null,
        source: "privy",
        canPost: false,
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      },
    ]);

    const result = await getLinkedAccountsByAddress("0x" + "a".repeat(40));

    expect(result).toHaveLength(1);
    expect(result[0]?.platform).toBe("x");
  });

  it("uses the primary client when requested", async () => {
    prismaMock.linkedSocialAccount.findMany.mockResolvedValueOnce([
      {
        platform: "farcaster",
        platformId: "1",
        username: "alice",
        displayName: "Alice",
        avatarUrl: null,
        source: "privy",
        canPost: false,
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      },
    ]);

    const result = await getLinkedAccountsByAddress("0x" + "b".repeat(40), {
      usePrimary: true,
    });

    expect(prismaMock.$primary).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });
});
