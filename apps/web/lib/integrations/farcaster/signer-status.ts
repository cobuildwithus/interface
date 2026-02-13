import "server-only";

import { unstable_cache } from "next/cache";
import { neynarLookupSigner } from "@/lib/integrations/farcaster/neynar-client";

const SIGNER_STATUS_CACHE_TTL = 60; // seconds

export function getSignerStatusCacheTag(fid: number): string {
  return `neynar-signer:${fid}`;
}

export function getSignerStatusUuidCacheTag(signerUuid: string): string {
  return `neynar-signer:uuid:${signerUuid}`;
}

function normalizeFid(fid: number | null | undefined): number | null {
  if (!Number.isFinite(fid as number)) return null;
  const value = Number(fid);
  return value > 0 ? value : null;
}

export async function getCachedNeynarSignerStatus(signerUuid: string, fid?: number | null) {
  const normalizedFid = normalizeFid(fid);
  const tags = [getSignerStatusUuidCacheTag(signerUuid)];
  if (normalizedFid) tags.push(getSignerStatusCacheTag(normalizedFid));

  const cachedLookup = unstable_cache(
    () => neynarLookupSigner(signerUuid),
    ["neynar-signer-status", signerUuid, normalizedFid ? String(normalizedFid) : "unknown"],
    { tags, revalidate: SIGNER_STATUS_CACHE_TTL }
  );

  return cachedLookup();
}
