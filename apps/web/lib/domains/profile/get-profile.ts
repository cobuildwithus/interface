import "server-only";

import prisma from "@/lib/server/db/cobuild-db-client";
import { normalizeAddress } from "@/lib/shared/address";
import { truncateAddress } from "@/lib/shared/utils";
import { getProfileFromWhisk, getProfilesFromWhisk } from "@/lib/integrations/whisk/profile";
import { unstable_cache } from "next/cache";
import { getEmptyProfile } from "./empty-profile";
import { type Profile, getProfileUrl } from "./types";
import { CACHE_TTL } from "@/lib/config/cache";

// Known contract addresses with custom display names
const KNOWN_CONTRACTS: Record<string, { name: string; avatar: string }> = {
  "0x1880d832aa283d05b8eab68877717e25fbd550bb": {
    name: "RevLoans",
    avatar: "https://jbm.infura-ipfs.io/ipfs/QmS6aZ8q2PAZWPwqzeiYu8oC95agn2sgg65irud99cfbqp",
  },
};

function getKnownContractProfile(address: string): Profile | null {
  const normalized = address;
  const contract = KNOWN_CONTRACTS[normalized];
  if (!contract) return null;
  return {
    address: normalized,
    name: contract.name,
    avatar: contract.avatar,
    bio: null,
    farcaster: {
      fid: null,
      name: null,
      avatar: contract.avatar,
      bio: null,
      neynarUserScore: null,
    },
    url: getProfileUrl(normalized, null),
  };
}

export async function getProfile(rawAddress: string): Promise<Profile> {
  return unstable_cache(
    async () => {
      try {
        const address = normalizeAddress(rawAddress);

        // Check for known contract addresses first
        const knownProfile = getKnownContractProfile(address);
        if (knownProfile) return knownProfile;

        const [row] = await fetchLatestProfilesByAddress([address]);
        const dbProfile =
          row?.fid != null
            ? {
                fid: row.fid,
                fname: row.fname ?? null,
                displayName: row.displayName ?? null,
                avatarUrl: row.avatarUrl ?? null,
                bio: row.bio ?? null,
                neynarUserScore: row.neynarUserScore ?? null,
              }
            : null;

        if (dbProfile) return buildProfileFromDb(address, dbProfile);

        // Fallback to Whisk
        const whiskProfile = await getProfileFromWhisk(address);
        return whiskProfile ?? getEmptyProfile(address);
      } catch (error) {
        console.error("Error fetching profile:", error);
        return getEmptyProfile(rawAddress);
      }
    },
    ["profile-v4", rawAddress],
    { tags: ["profile-v4", rawAddress], revalidate: CACHE_TTL.PROFILE }
  )();
}

export async function getProfiles(rawAddresses: string[]): Promise<Profile[]> {
  if (rawAddresses.length === 0) return [];

  const normalizedCacheKey = [...new Set(rawAddresses.map(normalizeAddress))].sort().join("_");

  return unstable_cache(
    async () => {
      try {
        const addresses = rawAddresses.map(normalizeAddress);
        const uniqueAddresses = Array.from(new Set(addresses));

        const dbProfiles = await fetchLatestProfilesByAddress(uniqueAddresses);

        // Find addresses not in DB
        const foundAddresses = new Set(
          dbProfiles.filter((p) => p.fid != null).map((p) => p.address)
        );
        const missingAddresses = addresses.filter((a) => !foundAddresses.has(a));

        // Fetch missing from Whisk
        const whiskProfiles =
          missingAddresses.length > 0 ? await getProfilesFromWhisk(missingAddresses) : null;
        const whiskMap = new Map((whiskProfiles ?? []).map((p) => [p.address, p]));
        const addressToDbProfile = new Map<string, DBProfile>();
        for (const row of dbProfiles) {
          if (row.fid == null) continue;
          addressToDbProfile.set(row.address, {
            fid: row.fid,
            fname: row.fname ?? null,
            displayName: row.displayName ?? null,
            avatarUrl: row.avatarUrl ?? null,
            bio: row.bio ?? null,
            neynarUserScore: row.neynarUserScore ?? null,
          });
        }

        return addresses.map((address) => {
          // Check for known contract addresses first
          const knownProfile = getKnownContractProfile(address);
          if (knownProfile) return knownProfile;

          const dbProfile = addressToDbProfile.get(address);
          if (dbProfile) return buildProfileFromDb(address, dbProfile);
          return whiskMap.get(address) ?? getEmptyProfile(address);
        });
      } catch (error) {
        console.error("Error fetching profiles:", error);
        return rawAddresses.map(getEmptyProfile);
      }
    },
    ["profiles-v3", normalizedCacheKey],
    { tags: ["profiles-v3"], revalidate: CACHE_TTL.PROFILE }
  )();
}

type DBProfile = {
  fid: bigint;
  fname: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  neynarUserScore: number | null;
};

type LatestProfileRow = {
  address: string;
  fid: bigint | null;
  fname: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  neynarUserScore: number | null;
};

function buildProfileFromDb(address: string, db: DBProfile): Profile {
  const fid = Number(db.fid);
  const rawScore = db.neynarUserScore;
  const neynarUserScore =
    typeof rawScore === "number" && Number.isFinite(rawScore) ? rawScore : null;

  return {
    address,
    name: db.displayName || db.fname || truncateAddress(address),
    avatar: db.avatarUrl,
    bio: db.bio,
    farcaster: {
      fid: Number.isFinite(fid) && fid > 0 ? fid : null,
      name: db.fname,
      avatar: db.avatarUrl,
      bio: db.bio,
      neynarUserScore,
    },
    url: getProfileUrl(address, db.fname),
  };
}

async function fetchLatestProfilesByAddress(addresses: string[]): Promise<LatestProfileRow[]> {
  if (addresses.length === 0) return [];
  return prisma.$replica().$queryRaw<LatestProfileRow[]>`
    SELECT
      input.address AS "address",
      p.fid AS "fid",
      p.fname AS "fname",
      p.display_name AS "displayName",
      p.avatar_url AS "avatarUrl",
      p.bio AS "bio",
      p.neynar_user_score AS "neynarUserScore"
    FROM unnest(${addresses}::text[]) AS input(address)
    LEFT JOIN LATERAL (
      SELECT
        fid,
        fname,
        display_name,
        avatar_url,
        bio,
        neynar_user_score
      FROM farcaster.profiles
      WHERE verified_addresses @> ARRAY[input.address]::text[]
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 1
    ) p ON true;
  `;
}
