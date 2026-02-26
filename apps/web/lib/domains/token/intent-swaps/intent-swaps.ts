import "server-only";
import prisma from "@/lib/server/db/cobuild-db-client";
import { parseEntityId } from "@/lib/shared/entity-id";
import { toFiniteNumber, roundToCents } from "@/lib/shared/numbers";
import type { CastIntentSwap } from "./intent-swaps.shared";
import { contracts, BASE_CHAIN_ID } from "../onchain/addresses";

export async function getSwapsByEntityId(entityId: string): Promise<CastIntentSwap[]> {
  const parsed = parseEntityId(entityId, { allowUnknown: true, unknownCase: "lower" });
  if (!parsed) return [];
  const candidates = parsed.queryAliases;

  const [tokenMeta, intents] = await Promise.all([
    prisma.tokenMetadata.findUnique({
      where: {
        chainId_address: {
          chainId: BASE_CHAIN_ID,
          address: contracts.CobuildToken,
        },
      },
      select: { decimals: true, symbol: true },
    }),
    prisma.intent.findMany({
      where: {
        status: "SENT",
        targetChainId: BASE_CHAIN_ID,
        targetTokenAddress: contracts.CobuildToken,
        entityId: { in: candidates },
      },
      select: {
        id: true,
        walletAddressFrom: true,
        reaction: true,
        targetAmount: true,
        spendAmountNum: true,
        createdAt: true,
        swapExecuted: { select: { amountOut: true } },
        spendTokenMetadata: { select: { priceUsdc: true, decimals: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const targetDecimals = tokenMeta?.decimals ?? 18;
  const tokenSymbol = tokenMeta?.symbol ?? "$COBUILD";

  const swaps: CastIntentSwap[] = [];

  for (const intent of intents) {
    const wallet = intent.walletAddressFrom;
    if (!wallet) continue;

    let rawAmount: number | null = null;
    if (intent.targetAmount) {
      rawAmount = toFiniteNumber(intent.targetAmount);
    }
    if (rawAmount === null && intent.swapExecuted?.amountOut) {
      rawAmount = toFiniteNumber(intent.swapExecuted.amountOut);
    }
    if (rawAmount === null || rawAmount <= 0) continue;

    const tokensBought = rawAmount / Math.pow(10, targetDecimals);
    if (!Number.isFinite(tokensBought) || tokensBought <= 0) continue;

    const spendDecimals = intent.spendTokenMetadata?.decimals ?? 6;
    const spendPrice = toFiniteNumber(intent.spendTokenMetadata?.priceUsdc) ?? 1;
    const spendRaw = toFiniteNumber(intent.spendAmountNum) ?? 0;
    const spendUsdc = (spendRaw / Math.pow(10, spendDecimals)) * spendPrice;

    swaps.push({
      id: String(intent.id),
      backerAddress: wallet,
      reaction: intent.reaction,
      spendUsdc: roundToCents(spendUsdc),
      tokensBought: roundToCents(tokensBought),
      tokenSymbol,
    });
  }

  return swaps;
}

export async function getSwapsByCastHash(castHash: string): Promise<CastIntentSwap[]> {
  return getSwapsByEntityId(castHash);
}
