"use server";

import { getPrivyLinkedIdentity } from "@/lib/domains/auth/session";
import { upsertLinkedAccount } from "@/lib/domains/auth/linked-accounts/store";
import { normalizeAddress } from "@/lib/shared/address";

export type LinkedAccountsSyncResult =
  | { ok: true; updated: number }
  | { ok: false; reason: "missing_session" | "missing_address" };

export async function syncLinkedAccountsFromSession(): Promise<LinkedAccountsSyncResult> {
  const identity = await getPrivyLinkedIdentity();
  if (!identity) {
    return { ok: false, reason: "missing_session" };
  }

  const { wallet, farcaster, twitter } = identity;
  if (!wallet?.address) {
    return { ok: false, reason: "missing_address" };
  }

  const ownerAddress = normalizeAddress(wallet.address);
  const updates: Array<ReturnType<typeof upsertLinkedAccount>> = [];

  if (farcaster?.fid) {
    updates.push(
      upsertLinkedAccount({
        ownerAddress,
        platform: "farcaster",
        platformId: String(farcaster.fid),
        username: farcaster.username ?? null,
        displayName: farcaster.displayName ?? null,
        avatarUrl: farcaster.pfp ?? null,
        source: "privy",
        canPost: false,
      })
    );
  }

  const twitterAccount = twitter ?? null;
  const twitterPlatformId = twitterAccount?.subject ?? twitterAccount?.username ?? null;
  if (twitterAccount && twitterPlatformId) {
    updates.push(
      upsertLinkedAccount({
        ownerAddress,
        platform: "x",
        platformId: twitterPlatformId,
        username: twitterAccount.username ?? null,
        displayName: twitterAccount.name ?? null,
        avatarUrl: twitterAccount.profilePictureUrl ?? null,
        source: "privy",
        canPost: false,
      })
    );
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }

  return { ok: true, updated: updates.length };
}
