import "server-only";

import prisma from "@/lib/server/db/cobuild-db-client";
import {
  getPreferredLinkedFarcasterAccount,
  type LinkedAccountServerView,
} from "@/lib/domains/auth/linked-accounts/server-view";
import type { FarcasterProfileInfo } from "@/lib/integrations/farcaster/profile-types";
import type { Session } from "./session-types";
import { getLinkedAccountsServerView } from "./linked-accounts-response";

export async function getFarcasterProfileInfo(
  session: Session,
  options?: { linkedAccounts?: LinkedAccountServerView[]; usePrimary?: boolean }
): Promise<FarcasterProfileInfo> {
  const farcaster = session.farcaster ?? null;
  const address = session.address ?? null;
  let preferredAccount: LinkedAccountServerView | null = null;

  if (address) {
    const linkedAccounts =
      options?.linkedAccounts ??
      (await getLinkedAccountsServerView(address, { usePrimary: options?.usePrimary })).accounts;
    preferredAccount = getPreferredLinkedFarcasterAccount(linkedAccounts);
  }

  const preferredFid = preferredAccount?.platform === "farcaster" ? preferredAccount.fid : null;
  const preferredUsername =
    preferredAccount?.platform === "farcaster" ? preferredAccount.username : null;
  const preferredDisplayName =
    preferredAccount?.platform === "farcaster" ? preferredAccount.displayName : null;
  const preferredPfp =
    preferredAccount?.platform === "farcaster" ? preferredAccount.avatarUrl : null;

  const fid = preferredFid ?? farcaster?.fid ?? null;
  const username = preferredUsername ?? farcaster?.username ?? null;
  const displayName = preferredDisplayName ?? farcaster?.displayName ?? null;
  const pfp = preferredPfp ?? farcaster?.pfp ?? null;

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
