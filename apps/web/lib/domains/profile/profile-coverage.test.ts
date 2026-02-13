import { describe, expect, it, vi, beforeEach } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";
import { getEmptyProfile } from "@/lib/domains/profile/empty-profile";

const ADDRESS = "0x" + "a".repeat(40);
const KNOWN_CONTRACT = "0x1880d832aa283d05b8eab68877717e25fbd550bb";
const passthroughCache: typeof unstableCache = (fn, _keyParts, _options) => fn;

vi.mock("server-only", () => ({}));

describe("getEmptyProfile", () => {
  it("builds a placeholder profile", () => {
    const profile = getEmptyProfile(ADDRESS);
    expect(profile.address).toBe(ADDRESS);
    expect(profile.name).toContain("0x");
    expect(profile.url).toBe(`https://basescan.org/address/${ADDRESS}`);
  });
});

describe("getProfile", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns db profile when available", async () => {
    const queryRaw = vi.fn().mockResolvedValue([
      {
        address: ADDRESS,
        fid: 0n,
        fname: "alice",
        displayName: "Alice",
        avatarUrl: "avatar",
        bio: "bio",
        neynarUserScore: 0.5,
      },
    ]);
    const prisma = {
      $queryRaw: queryRaw,
      $replica: () => ({ $queryRaw: queryRaw }),
    };

    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/server/db/cobuild-db-client", () => ({ default: prisma }));
    vi.doMock("@/lib/integrations/whisk/profile", () => ({
      getProfileFromWhisk: vi.fn().mockResolvedValue(null),
      getProfilesFromWhisk: vi.fn().mockResolvedValue(null),
    }));

    const { getProfile } = await import("@/lib/domains/profile/get-profile");
    const profile = await getProfile(ADDRESS);

    expect(profile.farcaster.fid).toBeNull();
    expect(profile.name).toBe("Alice");
  });

  it("returns known contract profile without db lookup", async () => {
    const queryRaw = vi.fn();
    const prisma = { $queryRaw: queryRaw, $replica: () => ({ $queryRaw: queryRaw }) };

    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/server/db/cobuild-db-client", () => ({ default: prisma }));
    vi.doMock("@/lib/integrations/whisk/profile", () => ({
      getProfileFromWhisk: vi.fn().mockResolvedValue(null),
      getProfilesFromWhisk: vi.fn().mockResolvedValue(null),
    }));

    const { getProfile } = await import("@/lib/domains/profile/get-profile");
    const profile = await getProfile(KNOWN_CONTRACT);

    expect(profile.name).toBe("RevLoans");
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("normalizes fid and neynar score", async () => {
    const queryRaw = vi.fn().mockResolvedValue([
      {
        address: ADDRESS,
        fid: 42n,
        fname: "bob",
        displayName: null,
        avatarUrl: null,
        bio: null,
        neynarUserScore: Number.POSITIVE_INFINITY,
      },
    ]);
    const prisma = {
      $queryRaw: queryRaw,
      $replica: () => ({ $queryRaw: queryRaw }),
    };

    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/server/db/cobuild-db-client", () => ({ default: prisma }));
    vi.doMock("@/lib/integrations/whisk/profile", () => ({
      getProfileFromWhisk: vi.fn().mockResolvedValue(null),
      getProfilesFromWhisk: vi.fn().mockResolvedValue(null),
    }));

    const { getProfile } = await import("@/lib/domains/profile/get-profile");
    const profile = await getProfile(ADDRESS);

    expect(profile.farcaster.fid).toBe(42);
    expect(profile.name).toBe("bob");
    expect(profile.farcaster.neynarUserScore).toBeNull();
  });

  it("falls back to whisk when db missing", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ address: ADDRESS, fid: null }]);
    const prisma = {
      $queryRaw: queryRaw,
      $replica: () => ({ $queryRaw: queryRaw }),
    };

    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/server/db/cobuild-db-client", () => ({ default: prisma }));
    vi.doMock("@/lib/integrations/whisk/profile", () => ({
      getProfileFromWhisk: vi.fn().mockResolvedValue({
        address: ADDRESS,
        name: "Whisk",
        avatar: null,
        bio: null,
        farcaster: { fid: null, name: null, avatar: null, bio: null, neynarUserScore: null },
        url: `https://basescan.org/address/${ADDRESS}`,
      }),
      getProfilesFromWhisk: vi.fn().mockResolvedValue(null),
    }));

    const { getProfile } = await import("@/lib/domains/profile/get-profile");
    const profile = await getProfile(ADDRESS);

    expect(profile.name).toBe("Whisk");
  });

  it("returns empty profile on error", async () => {
    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/server/db/cobuild-db-client", () => ({
      default: {
        $replica: () => ({
          $queryRaw: vi.fn().mockRejectedValue(new Error("boom")),
        }),
      },
    }));
    vi.doMock("@/lib/integrations/whisk/profile", () => ({
      getProfileFromWhisk: vi.fn().mockResolvedValue(null),
      getProfilesFromWhisk: vi.fn().mockResolvedValue(null),
    }));

    const { getProfile } = await import("@/lib/domains/profile/get-profile");
    const profile = await getProfile(ADDRESS);

    expect(profile.address).toBe(ADDRESS);
    expect(profile.name).toContain("0x");
  });
});

describe("getProfiles", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns empty list for empty input", async () => {
    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/server/db/cobuild-db-client", () => ({ default: { farcasterProfile: {} } }));
    vi.doMock("@/lib/integrations/whisk/profile", () => ({
      getProfileFromWhisk: vi.fn(),
      getProfilesFromWhisk: vi.fn(),
    }));

    const { getProfiles } = await import("@/lib/domains/profile/get-profile");
    await expect(getProfiles([])).resolves.toEqual([]);
  });

  it("hydrates from db + whisk fallback", async () => {
    const queryRaw = vi.fn().mockResolvedValue([
      {
        address: ADDRESS,
        fid: 1n,
        fname: "alice",
        displayName: null,
        avatarUrl: null,
        bio: null,
        neynarUserScore: null,
      },
    ]);
    const prisma = {
      $queryRaw: queryRaw,
      $replica: () => ({ $queryRaw: queryRaw }),
    };

    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/server/db/cobuild-db-client", () => ({ default: prisma }));
    vi.doMock("@/lib/integrations/whisk/profile", () => ({
      getProfilesFromWhisk: vi.fn().mockResolvedValue([
        {
          address: "0x" + "b".repeat(40),
          name: "Whisk",
          avatar: null,
          bio: null,
          farcaster: { fid: null, name: null, avatar: null, bio: null, neynarUserScore: null },
          url: "https://basescan.org/address/" + "0x" + "b".repeat(40),
        },
      ]),
      getProfileFromWhisk: vi.fn(),
    }));

    const { getProfiles } = await import("@/lib/domains/profile/get-profile");
    const result = await getProfiles([ADDRESS, "0x" + "b".repeat(40)]);

    expect(result).toHaveLength(2);
    expect(result[0]?.farcaster.fid).toBe(1);
  });

  it("returns known contract profile in list", async () => {
    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/server/db/cobuild-db-client", () => ({
      default: {
        $replica: () => ({ $queryRaw: vi.fn().mockResolvedValue([]) }),
      },
    }));
    vi.doMock("@/lib/integrations/whisk/profile", () => ({
      getProfilesFromWhisk: vi.fn().mockResolvedValue(null),
      getProfileFromWhisk: vi.fn(),
    }));

    const { getProfiles } = await import("@/lib/domains/profile/get-profile");
    const result = await getProfiles([KNOWN_CONTRACT]);

    expect(result[0]?.name).toBe("RevLoans");
  });

  it("returns empty profiles on error", async () => {
    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/server/db/cobuild-db-client", () => ({
      default: {
        $replica: () => ({ $queryRaw: vi.fn().mockRejectedValue(new Error("boom")) }),
      },
    }));
    vi.doMock("@/lib/integrations/whisk/profile", () => ({
      getProfilesFromWhisk: vi.fn(),
      getProfileFromWhisk: vi.fn(),
    }));

    const { getProfiles } = await import("@/lib/domains/profile/get-profile");
    const result = await getProfiles([ADDRESS]);
    expect(result[0]?.address).toBe(ADDRESS);
  });
});
