import "server-only";

import prisma from "@/lib/server/db/cobuild-db-client";
import { unstable_cache } from "next/cache";

type FarcasterAddressMatch = {
  fid: number;
  neynarUserScore: number | null;
};

/**
 * Bulk resolve lowercased addresses to { fid, neynarUserScore } from Cobuild DB (farcaster.profiles).
 * Returns a Map of lowercase address -> match.
 */
export async function getFidsByAddresses(
  addresses: string[]
): Promise<Map<string, FarcasterAddressMatch>> {
  const toQuery = Array.from(
    new Set(addresses.map((a) => a.toLowerCase().trim()).filter((a) => a.length > 0))
  );
  if (toQuery.length === 0) return new Map();

  const entries = await getFidsByAddressesCached(toQuery);
  return new Map(entries);
}

const getFidsByAddressesCached = unstable_cache(
  async (toQuery: string[]): Promise<Array<[string, FarcasterAddressMatch]>> => {
    const result = new Map<string, FarcasterAddressMatch>();
    try {
      const profiles = await prisma.farcasterProfile.findMany({
        where: { verifiedAddresses: { hasSome: toQuery } },
        select: { fid: true, verifiedAddresses: true, neynarUserScore: true },
      });

      for (const p of profiles) {
        const fidNum = Number(p.fid);
        for (const addr of p.verifiedAddresses ?? []) {
          const lower = addr.toLowerCase();
          if (result.has(lower)) continue;
          result.set(lower, {
            fid: fidNum,
            neynarUserScore:
              typeof p.neynarUserScore === "number" && Number.isFinite(p.neynarUserScore)
                ? p.neynarUserScore
                : null,
          });
        }
      }
    } catch (err) {
      console.error("getFidsByAddresses error:", err);
    }
    return Array.from(result.entries());
  },
  ["fids-by-addresses-v1"],
  { revalidate: 300 }
);
