import { NEYNAR_ELIGIBILITY_MIN_SCORE } from "@/lib/domains/eligibility/constants";
import { parseEntityId } from "@/lib/shared/entity-id";
import { toFiniteNumber, type Numberish } from "@/lib/shared/numbers";
import type { CastAggregation, FidMatch, RawContribution } from "./types";

export function normalizeEntityIds(ids: string[]): {
  canonicalToOriginal: Map<string, string>;
  canonicalIds: string[];
  queryValues: string[];
} {
  const canonicalToOriginal = new Map<string, string>();
  const canonical = new Set<string>();
  const queryValues = new Set<string>();

  for (const raw of ids) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const parsed = parseEntityId(trimmed, { allowUnknown: true, unknownCase: "lower" });
    if (!parsed) continue;

    canonical.add(parsed.entityId);
    for (const alias of parsed.queryAliases) queryValues.add(alias);

    if (!canonicalToOriginal.has(parsed.entityId)) {
      canonicalToOriginal.set(parsed.entityId, trimmed);
    }
  }

  return {
    canonicalToOriginal,
    canonicalIds: Array.from(canonical),
    queryValues: Array.from(queryValues),
  };
}

export function normalizeEntityId(
  id: string,
  options: { allowUnknown: boolean; unknownCase: "lower" | "preserve" }
): string | null {
  if (!id) return null;
  const parsed = parseEntityId(id, options);
  return parsed ? parsed.entityId : null;
}

/**
 * Parses a raw intent amount (targetAmount or swapExecuted.amountOut) to tokens.
 * Returns null if the amount is invalid or non-positive.
 */
export function parseIntentAmount(
  targetAmount: string | null | undefined,
  swapAmountOut: Numberish,
  decimals: number
): number | null {
  let rawAmount: number | null = null;
  if (targetAmount) {
    rawAmount = toFiniteNumber(targetAmount);
  }
  if (rawAmount === null && swapAmountOut) {
    rawAmount = toFiniteNumber(swapAmountOut);
  }
  if (rawAmount === null || rawAmount <= 0) return null;

  const tokens = rawAmount / Math.pow(10, decimals);
  if (!Number.isFinite(tokens) || tokens <= 0) return null;

  return tokens;
}

/**
 * Checks if a backer is eligible for quadratic matching based on fid and neynar score.
 */
export function isBackerEligible(match: FidMatch | undefined): boolean {
  if (!match) return false;
  const { fid, neynarUserScore } = match;
  return fid != null && neynarUserScore != null && neynarUserScore >= NEYNAR_ELIGIBILITY_MIN_SCORE;
}

/**
 * Aggregates raw contributions by cast hash, separating eligible vs all backers.
 * Returns a map from lowercase cast hash to aggregation data.
 */
export function aggregateContributions(
  contributions: RawContribution[],
  validHashes: Set<string>,
  fidMatches: Map<string, FidMatch>
): Map<string, CastAggregation> {
  const statsByHash = new Map<string, CastAggregation>();

  for (const { castHash, wallet, tokens, spendUsdc } of contributions) {
    const hashLower = castHash.toLowerCase();
    if (!validHashes.has(hashLower)) continue;

    if (!statsByHash.has(hashLower)) {
      statsByHash.set(hashLower, {
        eligibleBackerTotals: new Map(),
        allWallets: new Set(),
        totalTokens: 0,
        totalSpendUsdc: 0,
      });
    }

    const stats = statsByHash.get(hashLower)!;
    stats.totalTokens += tokens;
    stats.totalSpendUsdc += spendUsdc;
    stats.allWallets.add(wallet);

    const match = fidMatches.get(wallet);
    if (isBackerEligible(match)) {
      const backerKey = `fid:${match!.fid}`;
      stats.eligibleBackerTotals.set(
        backerKey,
        (stats.eligibleBackerTotals.get(backerKey) ?? 0) + tokens
      );
    }
  }

  return statsByHash;
}
