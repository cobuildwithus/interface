import "server-only";

import prisma from "@/lib/server/db/cobuild-db-client";
import { revalidateTag, unstable_cache } from "next/cache";
import { CACHE_TTL } from "@/lib/config/cache";
import { normalizeAddress } from "@/lib/shared/address";
import type { LinkedAccountPlatform, LinkedAccountRecord, LinkedAccountSource } from "./types";

const LINKED_ACCOUNTS_TAG = "linked-accounts";

type UpsertLinkedAccountParams = {
  ownerAddress: string;
  platform: LinkedAccountPlatform;
  platformId: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  source: LinkedAccountSource;
  canPost?: boolean;
};

export function getLinkedAccountsCacheTag(address: string): string {
  return `${LINKED_ACCOUNTS_TAG}:${normalizeAddress(address)}`;
}

function resolveNextState(
  existing: { canPost: boolean; source: LinkedAccountSource } | null,
  incoming: { canPost?: boolean; source: LinkedAccountSource }
): { canPost: boolean; source: LinkedAccountSource } {
  const canPost = (existing?.canPost ?? false) || incoming.canPost === true;
  const source =
    canPost || existing?.source === "neynar_signer" || incoming.source === "neynar_signer"
      ? "neynar_signer"
      : incoming.source;
  return { canPost, source };
}

function toRecord(row: {
  platform: LinkedAccountPlatform;
  platformId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  source: LinkedAccountSource;
  canPost: boolean;
  updatedAt: Date;
}): LinkedAccountRecord {
  return {
    platform: row.platform,
    platformId: row.platformId,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    source: row.source,
    canPost: row.canPost,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function upsertLinkedAccount(params: UpsertLinkedAccountParams) {
  const ownerAddress = normalizeAddress(params.ownerAddress);
  const platformId = params.platformId.trim();

  const existing = await prisma.linkedSocialAccount.findUnique({
    where: {
      ownerAddress_platform_platformId: {
        ownerAddress,
        platform: params.platform,
        platformId,
      },
    },
  });

  const { canPost, source } = resolveNextState(
    existing ? { canPost: existing.canPost, source: existing.source } : null,
    { canPost: params.canPost, source: params.source }
  );

  const data = {
    ownerAddress,
    platform: params.platform,
    platformId,
    username: params.username ?? existing?.username ?? null,
    displayName: params.displayName ?? existing?.displayName ?? null,
    avatarUrl: params.avatarUrl ?? existing?.avatarUrl ?? null,
    source,
    canPost,
    revokedAt: null,
  };

  const record = existing
    ? await prisma.linkedSocialAccount.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.linkedSocialAccount.create({ data });

  revalidateTag(getLinkedAccountsCacheTag(ownerAddress), "default");

  return toRecord(record);
}

export async function getLinkedAccountsByAddress(
  address: string,
  options?: { usePrimary?: boolean }
): Promise<LinkedAccountRecord[]> {
  const normalized = normalizeAddress(address);
  const usePrimary = options?.usePrimary === true;
  const client = usePrimary ? prisma.$primary() : prisma;
  const cacheKey = usePrimary ? "primary" : "replica";

  return unstable_cache(
    async () => {
      const rows = await client.linkedSocialAccount.findMany({
        where: {
          ownerAddress: normalized,
          revokedAt: null,
        },
        orderBy: { updatedAt: "desc" },
        select: {
          platform: true,
          platformId: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          source: true,
          canPost: true,
          updatedAt: true,
        },
      });

      return rows.map(toRecord);
    },
    ["linked-accounts", normalized, cacheKey],
    { tags: [getLinkedAccountsCacheTag(normalized)], revalidate: CACHE_TTL.LINKED_ACCOUNTS }
  )();
}
