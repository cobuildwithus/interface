import "server-only";

import prisma from "@/lib/server/db/cobuild-db-client";
import { contracts } from "@/lib/domains/token/onchain/addresses";
import { roundToCents, toFiniteNumber, type Numberish } from "@/lib/shared/numbers";

const USDC_ADDRESS = contracts.USDCBase.toLowerCase();

export type RecentActivityItem = {
  id: string;
  tokenAddress: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  spendUsdc: number;
  tokensBought: number;
  createdAt: string;
  creatorAddress: string | null;
  pending: boolean;
  reaction: "like" | "recast" | "comment" | "quote_cast" | "follow" | "direct_swap" | null;
};

function toTokenAmount(raw: Numberish, decimals: number): number {
  const base = toFiniteNumber(raw);
  if (base === null) return 0;
  return base / Math.pow(10, decimals);
}

type SpendInfo = {
  spendUsdc: number;
  spendUsdValue: number;
  spendTokenAddress: string | null;
  spendRaw: number;
};

function resolveSpendInfo(params: {
  rawAmount: Numberish;
  decimals: number | null | undefined;
  priceUsdc: Numberish;
  spendTokenAddress: string | null | undefined;
}): SpendInfo {
  const spendDecimals = params.decimals ?? 6;
  const spendTokens = toTokenAmount(params.rawAmount, spendDecimals);
  const spendTokenAddress = params.spendTokenAddress?.toLowerCase() ?? null;
  const price = toFiniteNumber(params.priceUsdc) ?? (spendTokenAddress === USDC_ADDRESS ? 1 : 0);
  const spendUsdValue = Number.isFinite(spendTokens * price) ? spendTokens * price : 0;
  const spendRaw = Math.max(0, toFiniteNumber(params.rawAmount) ?? 0);

  return {
    spendUsdc: roundToCents(spendUsdValue),
    spendUsdValue,
    spendTokenAddress,
    spendRaw,
  };
}

function resolveIntentTokenAllocations(params: {
  intents: Array<{
    targetTokens: number;
    spendUsdValue: number;
    spendRaw: number;
    spendTokenAddress: string | null;
  }>;
  totalTokensBought: number;
}): number[] {
  const { intents, totalTokensBought } = params;
  if (intents.length === 0) return [];

  const useTargetAmounts = intents.every((intent) => intent.targetTokens > 0);
  if (useTargetAmounts) {
    return intents.map((intent) => intent.targetTokens);
  }

  if (!Number.isFinite(totalTokensBought) || totalTokensBought <= 0) {
    return intents.map(() => 0);
  }

  const totalSpendUsd = intents.reduce(
    (sum, intent) => sum + (intent.spendUsdValue > 0 ? intent.spendUsdValue : 0),
    0
  );

  if (totalSpendUsd > 0) {
    return intents.map((intent) => {
      const weight = intent.spendUsdValue > 0 ? intent.spendUsdValue / totalSpendUsd : 0;
      return totalTokensBought * weight;
    });
  }

  const firstToken = intents[0]?.spendTokenAddress ?? null;
  const sameSpendToken =
    firstToken !== null && intents.every((intent) => intent.spendTokenAddress === firstToken);
  const totalSpendRaw = intents.reduce(
    (sum, intent) => sum + (intent.spendRaw > 0 ? intent.spendRaw : 0),
    0
  );

  if (sameSpendToken && totalSpendRaw > 0) {
    return intents.map((intent) => {
      const weight = intent.spendRaw > 0 ? intent.spendRaw / totalSpendRaw : 0;
      return totalTokensBought * weight;
    });
  }

  const equalShare = totalTokensBought / intents.length;
  return intents.map(() => equalShare);
}

function resolveReaction(params: {
  reaction: string | null;
  reactionId: string | null;
}): RecentActivityItem["reaction"] {
  if (params.reaction === "like") return "like";
  if (params.reaction === "recast") return "recast";
  if (params.reaction === "comment") return "comment";
  if (params.reaction === "quote_cast") return "quote_cast";
  if (params.reaction === "follow") return "follow";
  if (params.reactionId?.startsWith("direct_swap:")) return "direct_swap";
  return null;
}

function buildActivityItem(params: {
  id: string | number | bigint;
  tokenAddress: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  spendUsdc: number;
  tokensBought: number;
  createdAt: string;
  creatorAddress: string | null;
  pending: boolean;
  reaction: RecentActivityItem["reaction"];
}): RecentActivityItem {
  return {
    id: String(params.id),
    tokenAddress: params.tokenAddress,
    tokenSymbol: params.tokenSymbol,
    tokenName: params.tokenName,
    spendUsdc: params.spendUsdc,
    tokensBought: params.tokensBought,
    createdAt: params.createdAt,
    creatorAddress: params.creatorAddress,
    pending: params.pending,
    reaction: params.reaction,
  };
}

async function getRecentActivityExecutedByWallet(
  walletAddress: string,
  limit: number
): Promise<RecentActivityItem[]> {
  const address = walletAddress.toLowerCase();
  const intentFilter = { walletAddressFrom: address, status: "SENT" } as const;
  const swaps = await prisma.swapExecuted.findMany({
    where: {
      OR: [{ recipient: address }, { intents: { some: intentFilter } }],
    },
    orderBy: { blockTimestamp: "desc" },
    take: limit,
    select: {
      id: true,
      recipient: true,
      tokenOut: true,
      amountOut: true,
      blockTimestamp: true,
      intents: {
        where: intentFilter,
        select: {
          id: true,
          walletAddressTo: true,
          reaction: true,
          reactionId: true,
          targetAmount: true,
          spendAmountNum: true,
          spendTokenAddress: true,
          spendTokenMetadata: {
            select: {
              decimals: true,
              priceUsdc: true,
            },
          },
        },
      },
      tokenOutErc20Token: {
        select: {
          name: true,
          symbol: true,
          decimals: true,
        },
      },
    },
  });

  if (swaps.length === 0) return [];

  return swaps.flatMap((swap) => {
    const tokenDecimals = swap.tokenOutErc20Token?.decimals ?? 18;
    const totalTokensBought = toTokenAmount(swap.amountOut, tokenDecimals);
    const createdAt = new Date(swap.blockTimestamp * 1000).toISOString();
    const tokenAddress = swap.tokenOut.toLowerCase();
    const tokenSymbol = swap.tokenOutErc20Token?.symbol ?? null;
    const tokenName = swap.tokenOutErc20Token?.name ?? null;

    const intents = swap.intents ?? [];
    const intentDetails = intents.map((intent) => {
      const spend = resolveSpendInfo({
        rawAmount: intent.spendAmountNum,
        decimals: intent.spendTokenMetadata?.decimals,
        priceUsdc: intent.spendTokenMetadata?.priceUsdc,
        spendTokenAddress: intent.spendTokenAddress,
      });
      const targetTokens = toTokenAmount(intent.targetAmount, tokenDecimals);

      return {
        intent,
        spend,
        targetTokens,
      };
    });

    const allocations = resolveIntentTokenAllocations({
      intents: intentDetails.map(({ spend, targetTokens }) => ({
        targetTokens,
        spendUsdValue: spend.spendUsdValue,
        spendRaw: spend.spendRaw,
        spendTokenAddress: spend.spendTokenAddress,
      })),
      totalTokensBought,
    });

    return intentDetails.map(({ intent, spend }, index) => {
      const tokensBought = allocations[index] ?? 0;

      return buildActivityItem({
        id: String(intent.id),
        tokenAddress,
        tokenSymbol,
        tokenName,
        spendUsdc: spend.spendUsdc,
        tokensBought,
        createdAt,
        creatorAddress: intent.walletAddressTo?.toLowerCase() ?? null,
        pending: false,
        reaction: resolveReaction({
          reaction: intent.reaction ?? null,
          reactionId: intent.reactionId ?? null,
        }),
      });
    });
  });
}

async function getPendingActivityByWallet(
  walletAddress: string,
  limit: number
): Promise<RecentActivityItem[]> {
  const address = walletAddress.toLowerCase();
  const intents = await prisma.intent.findMany({
    where: {
      walletAddressFrom: address,
      status: { in: ["PENDING", "QUEUED"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      walletAddressTo: true,
      reaction: true,
      reactionId: true,
      targetTokenAddress: true,
      targetAmount: true,
      createdAt: true,
      spendAmountNum: true,
      spendTokenAddress: true,
      targetTokenMetadata: {
        select: {
          name: true,
          symbol: true,
          decimals: true,
        },
      },
      spendTokenMetadata: {
        select: {
          decimals: true,
          priceUsdc: true,
        },
      },
    },
  });

  if (intents.length === 0) return [];

  return intents.map((intent) => {
    const tokenAddress = intent.targetTokenAddress.toLowerCase();
    const tokenDecimals = intent.targetTokenMetadata?.decimals ?? 18;
    const tokensBought = toTokenAmount(intent.targetAmount, tokenDecimals);
    const spend = resolveSpendInfo({
      rawAmount: intent.spendAmountNum,
      decimals: intent.spendTokenMetadata?.decimals,
      priceUsdc: intent.spendTokenMetadata?.priceUsdc,
      spendTokenAddress: intent.spendTokenAddress,
    });

    return buildActivityItem({
      id: String(intent.id),
      tokenAddress,
      tokenSymbol: intent.targetTokenMetadata?.symbol ?? null,
      tokenName: intent.targetTokenMetadata?.name ?? null,
      spendUsdc: spend.spendUsdc,
      tokensBought,
      createdAt: intent.createdAt.toISOString(),
      creatorAddress: intent.walletAddressTo?.toLowerCase() ?? null,
      pending: true,
      reaction: resolveReaction({
        reaction: intent.reaction ?? null,
        reactionId: intent.reactionId ?? null,
      }),
    });
  });
}

export async function getRecentActivityByWallet(
  walletAddress?: string,
  limit: number = 25
): Promise<RecentActivityItem[]> {
  const address = walletAddress?.trim();
  if (!address) return [];

  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));

  const [pending, executed] = await Promise.all([
    getPendingActivityByWallet(address, safeLimit),
    getRecentActivityExecutedByWallet(address, safeLimit),
  ]);

  const merged = [...pending, ...executed].sort((a, b) => {
    if (a.pending !== b.pending) return a.pending ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const deduped: RecentActivityItem[] = [];
  const seen = new Set<string>();
  for (const item of merged) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
    if (deduped.length >= safeLimit) break;
  }

  return deduped;
}
