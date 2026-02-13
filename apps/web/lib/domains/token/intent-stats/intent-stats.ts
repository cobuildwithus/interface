import prisma from "@/lib/server/db/cobuild-db-client";
import { getFidsByAddresses } from "@/lib/integrations/farcaster/address-lookup";
import { toFiniteNumber, roundToCents } from "@/lib/shared/numbers";
import { contracts, BASE_CHAIN_ID } from "../onchain/addresses";
import { QUADRATIC_POOL_USD } from "@/lib/config/rewards";
import { calculateAllQuadraticScores, distributeMatchPool } from "@/lib/shared/quadratic";
import type { IntentStats, FidMatch, RawContribution } from "./types";
import {
  aggregateContributions,
  normalizeEntityId,
  normalizeEntityIds,
  parseIntentAmount,
} from "./utils";

export type { IntentStats, RawContribution, FidMatch, CastAggregation } from "./types";
export { parseIntentAmount, isBackerEligible, aggregateContributions } from "./utils";

export async function getIntentStatsByEntityId(params: {
  entityIds: string[];
  roundEntityIds: string[];
}): Promise<Record<string, IntentStats>> {
  const { entityIds, roundEntityIds } = params;
  if (!entityIds.length || !roundEntityIds.length) return {};

  const entityNorm = normalizeEntityIds(entityIds);
  const roundNorm = normalizeEntityIds(roundEntityIds);
  if (!entityNorm.canonicalToOriginal.size || !roundNorm.canonicalIds.length) {
    return {};
  }

  const [tokenMeta, intents] = await Promise.all([
    prisma.tokenMetadata.findUnique({
      where: {
        chainId_address: {
          chainId: BASE_CHAIN_ID,
          address: contracts.CobuildToken,
        },
      },
      select: { decimals: true },
    }),
    prisma.intent.findMany({
      where: {
        status: "SENT",
        targetChainId: BASE_CHAIN_ID,
        targetTokenAddress: contracts.CobuildToken,
        entityId: { in: roundNorm.queryValues },
      },
      select: {
        entityId: true,
        walletAddressFrom: true,
        targetAmount: true,
        spendAmountNum: true,
        swapExecuted: { select: { amountOut: true } },
        spendTokenMetadata: { select: { decimals: true, priceUsdc: true } },
      },
    }),
  ]);

  const decimals = tokenMeta?.decimals ?? 18;

  // Step 1: Parse intents into raw contributions
  const contributions: RawContribution[] = [];
  const uniqueWallets = new Set<string>();

  for (const intent of intents) {
    const hashLower = normalizeEntityId(intent.entityId, {
      allowUnknown: true,
      unknownCase: "lower",
    });
    if (!hashLower) continue;

    const wallet = intent.walletAddressFrom?.toLowerCase();
    if (!wallet) continue;

    const tokens = parseIntentAmount(intent.targetAmount, intent.swapExecuted?.amountOut, decimals);
    if (tokens === null) continue;

    const spendDecimals = intent.spendTokenMetadata?.decimals ?? 6;
    const spendPrice = toFiniteNumber(intent.spendTokenMetadata?.priceUsdc) ?? 1;
    const spendRaw = toFiniteNumber(intent.spendAmountNum) ?? 0;
    const spendUsdc = (spendRaw / Math.pow(10, spendDecimals)) * spendPrice;

    contributions.push({ castHash: hashLower, wallet, tokens, spendUsdc });
    uniqueWallets.add(wallet);
  }

  // Step 2: Resolve fid/score for all wallets
  const fidMatches =
    uniqueWallets.size > 0
      ? await getFidsByAddresses(Array.from(uniqueWallets))
      : new Map<string, FidMatch>();

  // Step 3: Aggregate contributions by cast hash
  const validHashes = new Set(roundNorm.canonicalIds);
  const aggregations = aggregateContributions(contributions, validHashes, fidMatches);

  // Step 4: Calculate quadratic scores
  const quadraticByHash = calculateAllQuadraticScores(aggregations);

  // Step 5: Distribute match pool
  const { matchByHash, totalScore } = distributeMatchPool(
    quadraticByHash,
    roundNorm.canonicalIds.length,
    QUADRATIC_POOL_USD
  );

  // Step 6: Build result for requested castHashes
  const evenSplit =
    totalScore === 0 && roundNorm.canonicalIds.length > 0
      ? QUADRATIC_POOL_USD / roundNorm.canonicalIds.length
      : 0;
  const result: Record<string, IntentStats> = {};

  for (const [castLower, originalHash] of entityNorm.canonicalToOriginal) {
    const stats = aggregations.get(castLower);
    const quad = quadraticByHash.get(castLower);
    const isRoundHash = roundNorm.canonicalToOriginal.has(castLower);

    const hasData = stats || quad;
    const includeForEvenSplit = totalScore === 0 && isRoundHash;
    if (!hasData && !includeForEvenSplit) continue;

    const qfMatch = totalScore === 0 ? evenSplit : (matchByHash.get(castLower) ?? 0);

    result[originalHash] = {
      backersCount: quad?.backers ?? 0,
      totalBackersCount: stats?.allWallets.size ?? 0,
      raisedUsdc: roundToCents(stats?.totalSpendUsdc ?? 0),
      qfMatchUsd: roundToCents(qfMatch),
    };
  }

  return result;
}

export async function getIntentStatsByHash(params: {
  castHashes: string[];
  roundHashes: string[];
}): Promise<Record<string, IntentStats>> {
  return getIntentStatsByEntityId({
    entityIds: params.castHashes,
    roundEntityIds: params.roundHashes,
  });
}
