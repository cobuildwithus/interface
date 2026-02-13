import "server-only";

import { unstable_cache } from "next/cache";
import prisma from "@/lib/server/db/cobuild-db-client";
import {
  neynarFetchUsersByFids,
  extractScoreFromNeynarUser,
} from "@/lib/integrations/farcaster/neynar-client";
import { NEYNAR_ELIGIBILITY_MIN_SCORE } from "./constants";

export { NEYNAR_ELIGIBILITY_MIN_SCORE };

/**
 * Read the stored Neynar score for a Farcaster fid from the database.
 */
async function readNeynarScoreFromDb(fid: number): Promise<number | null> {
  try {
    const row = await prisma.farcasterProfile.findUnique({
      where: { fid: BigInt(fid) },
      select: { neynarUserScore: true },
    });
    const score = row?.neynarUserScore;
    return typeof score === "number" && Number.isFinite(score) ? score : null;
  } catch {
    return null;
  }
}

/**
 * Fetch the user's score from Neynar API and persist to Cobuild DB (farcaster.profiles).
 */
async function fetchAndPersistNeynarScore(fid: number): Promise<number | null> {
  const users = await neynarFetchUsersByFids([fid]);
  const user = users[0];
  const score = extractScoreFromNeynarUser(user);

  if (typeof score === "number" && Number.isFinite(score)) {
    try {
      await prisma.farcasterProfile.update({
        where: { fid: BigInt(fid) },
        data: {
          neynarUserScore: score,
          neynarUserScoreUpdatedAt: new Date(),
        },
      });
    } catch {
      // Profile may not exist yet; swallow write errors and return the live-fetched score
    }
    return score;
  }

  return null;
}

/**
 * Return the score if present in DB; otherwise, attempt on-demand fetch (cached) and persist.
 */
export async function getOrFetchNeynarScore(fid: number): Promise<number | null> {
  if (!Number.isFinite(fid) || fid <= 0) return null;
  const fromDb = await readNeynarScoreFromDb(fid);
  if (typeof fromDb === "number") return fromDb;

  const cachedFetch = unstable_cache(
    async () => fetchAndPersistNeynarScore(fid),
    ["neynar-score-fetch", String(fid)],
    { tags: [`neynar-score:${fid}`], revalidate: 300 } // 5 minutes
  );
  return cachedFetch();
}

type NeynarEligibilityReason = "missing" | "low" | null;

type NeynarEligibility = {
  /** True when missing score or score is below threshold. */
  ineligible: boolean;
  /** Specific reason why the user is ineligible. */
  reason: NeynarEligibilityReason;
  /** Raw score value when available (can be null if missing). */
  score: number | null;
};

/**
 * Compute eligibility for a given Farcaster fid. If fid is absent/invalid, we
 * return an eligible state (no SSR gate) and leave enforcement to server
 * actions which also enforce this check.
 */
export async function computeNeynarEligibilityForFid(
  fid: number | null | undefined
): Promise<NeynarEligibility> {
  if (!Number.isFinite(fid as number) || !fid || fid <= 0) {
    return { ineligible: false, reason: null, score: null };
  }

  const score = await getOrFetchNeynarScore(fid);
  if (score == null) {
    return { ineligible: true, reason: "missing", score: null };
  }
  if (score < NEYNAR_ELIGIBILITY_MIN_SCORE) {
    return { ineligible: true, reason: "low", score };
  }
  return { ineligible: false, reason: null, score };
}
