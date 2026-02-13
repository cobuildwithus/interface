import { revalidateTag } from "next/cache";

import { fetchJsonWithTimeout } from "@/lib/integrations/http/fetch";
import prisma from "@/lib/server/db/cobuild-db-client";

type RescoreRoundResult =
  | {
      ok: true;
      roundId: number;
      duelCount: number;
      castCount: number;
      persistedRows: number;
    }
  | { ok: false; error: string };

const RESCORE_TIMEOUT_MS = 30_000;

/**
 * Calls the farcaster-crons API to rescore a specific round.
 */
async function rescoreRound(roundId: number): Promise<RescoreRoundResult> {
  const apiUrl = process.env.CAST_RULES_API_URL;
  const apiKey = process.env.CAST_RULES_API_KEY;

  if (!apiUrl || !apiKey) {
    return { ok: false, error: "Cast rules API not configured." };
  }

  const endpoint = `${apiUrl.replace(/\/+$/, "")}/v1/post-rounds/rescore`;

  try {
    const data = await fetchJsonWithTimeout<{
      roundId: number;
      duelCount: number;
      castCount: number;
      persistedRows: number;
    }>(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      timeoutMs: RESCORE_TIMEOUT_MS,
      body: JSON.stringify({ roundId }),
    });

    return { ok: true, ...data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[rescore] Failed to rescore round ${roundId}:`, message);
    return { ok: false, error: message };
  }
}

/**
 * Finds all open rounds for a rule and triggers a rescore for each.
 * Used after moderation actions to ensure scores reflect the updated cast set.
 */
export async function rescoreOpenRoundsForRule(
  ruleId: number
): Promise<{ rescored: number[]; failed: number[] }> {
  const openRounds = await prisma.round.findMany({
    where: {
      primaryRuleId: ruleId,
      status: "open",
    },
    select: { id: true },
  });

  if (openRounds.length === 0) {
    return { rescored: [], failed: [] };
  }

  const rescored: number[] = [];
  const failed: number[] = [];

  for (const round of openRounds) {
    const roundId = Number(round.id);
    const result = await rescoreRound(roundId);
    if (result.ok) {
      rescored.push(roundId);
      console.log(
        `[rescore] Rescored round ${roundId}: ${result.duelCount} duels, ${result.castCount} casts`
      );
    } else {
      failed.push(roundId);
      console.error(`[rescore] Failed to rescore round ${roundId}: ${result.error}`);
    }
  }

  // Invalidate cache for round submissions so UI reflects new scores
  if (rescored.length > 0) {
    revalidateTag(`round:submissions:${ruleId}`, "seconds");
  }

  return { rescored, failed };
}
