import "server-only";

import prisma from "@/lib/server/db/cobuild-db-client";
import { getLinkedAccountsByAddress } from "@/lib/domains/auth/linked-accounts/store";
import type { LinkedAccountRecord } from "@/lib/domains/auth/linked-accounts/types";
import type { FarcasterProfileInfo } from "@/lib/integrations/farcaster/profile-types";
import type { Session } from "./session-types";

export async function getFarcasterProfileInfo(
  session: Session,
  options?: { linkedAccounts?: LinkedAccountRecord[]; usePrimary?: boolean }
): Promise<FarcasterProfileInfo> {
  const farcaster = session.farcaster ?? null;
  const address = session.address ?? null;

  const linkedAccounts =
    options?.linkedAccounts ??
    (address ? await getLinkedAccountsByAddress(address, { usePrimary: options?.usePrimary }) : []);

  let fid = farcaster?.fid ?? null;
  let username = farcaster?.username ?? null;
  let displayName = farcaster?.displayName ?? null;
  let pfp = farcaster?.pfp ?? null;

  if (!fid && address) {
    const farcasterAccounts = linkedAccounts.filter((account) => account.platform === "farcaster");
    const preferredAccount =
      farcasterAccounts.find((account) => account.source === "neynar_signer" || account.canPost) ??
      farcasterAccounts[0];

    if (preferredAccount) {
      const parsedFid = Number.parseInt(preferredAccount.platformId, 10);
      if (Number.isFinite(parsedFid) && parsedFid > 0) {
        fid = parsedFid;
      }
      username = preferredAccount.username ?? username;
      displayName = preferredAccount.displayName ?? displayName;
      pfp = preferredAccount.avatarUrl ?? pfp;
    }
  }

  if (!fid) {
    return { fid: null };
  }

  const client = options?.usePrimary ? prisma.$primary() : prisma;
  const profile = await client.farcasterProfile.findUnique({
    where: { fid: BigInt(fid) },
    select: { fname: true, displayName: true, avatarUrl: true },
  });

  return {
    fid,
    username: profile?.fname ?? username ?? null,
    displayName: profile?.displayName ?? displayName ?? null,
    pfp: profile?.avatarUrl ?? pfp ?? null,
  };
}
