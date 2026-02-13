import prisma from "@/lib/server/db/cobuild-db-client";
import { unstable_cache } from "next/cache";

type FarcasterProfile = {
  fid: number;
  username?: string;
  displayName?: string;
  pfp?: string;
  bio?: string;
  neynarScore?: number | null;
};

const FARCASTER_PROFILE_CACHE_TTL = 60 * 60 * 24; // 24 hours
const FARCASTER_PROFILE_SESSION_CACHE_TTL = 60 * 60 * 36; // 36 hours

export async function getFidsByUsernames(
  usernames: string[]
): Promise<{ fids: number[]; notFound: string[] }> {
  if (usernames.length === 0) return { fids: [], notFound: [] };

  const normalized = usernames.map((u) => u.toLowerCase().replace(/^@/, ""));

  const profiles = await prisma.farcasterProfile.findMany({
    where: { fname: { in: normalized } },
    select: { fid: true, fname: true },
  });

  const foundMap = new Map(profiles.map((p) => [p.fname?.toLowerCase(), Number(p.fid)]));
  const fids: number[] = [];
  const notFound: string[] = [];

  for (const username of normalized) {
    const fid = foundMap.get(username);
    if (fid != null) {
      fids.push(fid);
    } else {
      notFound.push(username);
    }
  }

  return { fids, notFound };
}

type FarcasterProfileMeta = {
  bio?: string;
  neynarScore: number | null;
};

const getProfileMetaByFidCached = unstable_cache(
  async (fid: number): Promise<FarcasterProfileMeta | undefined> => {
    try {
      const profile = await prisma.farcasterProfile.findUnique({
        where: { fid: BigInt(fid) },
        select: { bio: true, neynarUserScore: true },
      });
      if (!profile) return undefined;
      const score = profile.neynarUserScore;
      return {
        bio: profile.bio ?? undefined,
        neynarScore: typeof score === "number" && Number.isFinite(score) ? score : null,
      };
    } catch {
      return undefined;
    }
  },
  ["farcaster-profile-meta-by-fid"],
  { revalidate: FARCASTER_PROFILE_SESSION_CACHE_TTL, tags: ["farcaster-profile"] }
);

export async function getProfileMetaByFid(fid: number): Promise<FarcasterProfileMeta | undefined> {
  if (!Number.isFinite(fid) || fid <= 0) return undefined;
  return getProfileMetaByFidCached(fid);
}

export async function getFarcasterByVerifiedAddress(
  address: string
): Promise<FarcasterProfile | undefined> {
  const normalizedAddress = address.toLowerCase();

  return unstable_cache(
    async () => {
      try {
        const profile = await prisma.farcasterProfile.findFirst({
          where: {
            verifiedAddresses: { has: normalizedAddress },
          },
          select: {
            fid: true,
            fname: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            neynarUserScore: true,
          },
        });
        if (!profile) return undefined;
        const score = profile.neynarUserScore;
        return {
          fid: Number(profile.fid),
          username: profile.fname ?? undefined,
          displayName: profile.displayName ?? undefined,
          pfp: profile.avatarUrl ?? undefined,
          bio: profile.bio ?? undefined,
          neynarScore: typeof score === "number" && Number.isFinite(score) ? score : null,
        };
      } catch {
        return undefined;
      }
    },
    [`farcaster-profile-by-address-v3`, normalizedAddress],
    { revalidate: FARCASTER_PROFILE_CACHE_TTL, tags: ["farcaster-profile"] }
  )();
}
