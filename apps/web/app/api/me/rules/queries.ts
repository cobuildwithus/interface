import "server-only";

import prisma from "@/lib/server/db/cobuild-db-client";
import { BASE_CHAIN_ID, contracts } from "@/lib/domains/token/onchain/addresses";
import { Platform } from "@/generated/prisma/enums";
import type { Reaction } from "@/generated/prisma/enums";

const BASE_USDC_ADDRESS = contracts.USDCBase.toLowerCase();

type RuleRow = {
  reaction: Reaction;
  enabled: boolean;
  amount: string;
  updatedAt: Date;
};

export async function listRulesForAddress(ownerAddress: string): Promise<RuleRow[]> {
  return prisma.rule.findMany({
    where: {
      ownerAddress: ownerAddress.toLowerCase(),
      chainId: BASE_CHAIN_ID,
      tokenAddress: BASE_USDC_ADDRESS,
      platform: Platform.farcaster,
    },
    select: {
      reaction: true,
      enabled: true,
      amount: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export type RuleUpsert = {
  reaction: Reaction;
  amountMicros?: string;
  enabled?: boolean;
};

export async function upsertRulesForAddress(
  ownerAddress: string,
  updates: RuleUpsert[]
): Promise<void> {
  if (!Array.isArray(updates) || updates.length === 0) return;

  const normalizedOwner = ownerAddress.toLowerCase();

  await prisma.$transaction(async (tx) => {
    for (const update of updates) {
      const where = {
        ownerAddress: normalizedOwner,
        platform: Platform.farcaster,
        reaction: update.reaction,
        chainId: BASE_CHAIN_ID,
        tokenAddress: BASE_USDC_ADDRESS,
      };

      const data = {
        ...(update.amountMicros !== undefined ? { amount: update.amountMicros } : {}),
        ...(update.enabled !== undefined ? { enabled: update.enabled } : {}),
      };

      if (Object.keys(data).length === 0) continue;

      const { count } = await tx.rule.updateMany({
        where,
        data,
      });

      if (count === 0) {
        await tx.rule.create({
          data: {
            ...where,
            amount: update.amountMicros ?? "0",
            enabled: update.enabled ?? false,
          },
        });
      }
    }
  });
}
