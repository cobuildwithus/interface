import "server-only";

import prisma from "@/lib/server/db/cobuild-db-client";
import { materializeDiscussionNotificationsForProfileFids } from "@/lib/domains/notifications/materialize-discussion";
import {
  type NeynarUser,
  extractScoreFromNeynarUser,
  neynarFetchUsersByFids,
} from "@/lib/integrations/farcaster/neynar-client";

function extractVerifiedEthAddresses(user: NeynarUser | undefined): string[] {
  if (!user) return [];

  const addresses = new Set<string>();
  const custody = user.custody_address?.toLowerCase();
  const addAddress = (value?: string) => {
    if (!value) return;
    const normalized = value.toLowerCase();
    if (normalized === custody) return;
    addresses.add(normalized);
  };

  for (const candidate of [
    user.verified_addresses?.primary?.eth_address,
    ...(user.verified_addresses?.eth_addresses ?? []),
  ]) {
    addAddress(candidate);
  }

  return Array.from(addresses);
}

function uniqueAddresses(addresses: string[]): string[] {
  return Array.from(new Set(addresses.map((address) => address.toLowerCase())));
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

async function rematerializeDiscussionNotificationsForProfileFid(fid: number): Promise<void> {
  try {
    const materialized = await materializeDiscussionNotificationsForProfileFids([fid]);
    if (materialized > 0) {
      console.log(
        `[farcaster] rematerialized ${materialized} discussion notification(s) after wallet link`
      );
    }
  } catch (error) {
    console.warn("[farcaster] discussion notification rematerialization failed:", error);
  }
}

export async function persistFarcasterWalletLink(fid: number, rawAddress: `0x${string}`) {
  const address = rawAddress.toLowerCase();
  const profileFid = BigInt(fid);

  const existing = await prisma.farcasterProfile.findUnique({
    where: { fid: profileFid },
    select: { verifiedAddresses: true, manualVerifiedAddresses: true },
  });

  if (!existing) {
    const [user] = await neynarFetchUsersByFids([fid]);
    const score = extractScoreFromNeynarUser(user);
    const verifiedAddresses = uniqueAddresses([address, ...extractVerifiedEthAddresses(user)]);

    await prisma.farcasterProfile.create({
      data: {
        fid: profileFid,
        fname: user?.username ?? null,
        displayName: user?.display_name ?? null,
        avatarUrl: user?.pfp_url ?? null,
        bio: null,
        verifiedAddresses,
        manualVerifiedAddresses: [address],
        neynarUserScore: score ?? null,
        neynarUserScoreUpdatedAt: score !== null ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    await rematerializeDiscussionNotificationsForProfileFid(fid);
    return;
  }

  const existingVerifiedAddresses = existing.verifiedAddresses ?? [];
  const existingManualVerifiedAddresses = existing.manualVerifiedAddresses ?? [];
  const verifiedAddresses = uniqueAddresses([
    ...existingVerifiedAddresses,
    ...existingManualVerifiedAddresses,
    address,
  ]);
  const manualVerifiedAddresses = uniqueAddresses([...existingManualVerifiedAddresses, address]);

  if (
    arraysEqual(existingVerifiedAddresses, verifiedAddresses) &&
    arraysEqual(existingManualVerifiedAddresses, manualVerifiedAddresses)
  ) {
    return;
  }

  const verifiedAddressesChanged = !arraysEqual(existingVerifiedAddresses, verifiedAddresses);

  await prisma.farcasterProfile.update({
    where: { fid: profileFid },
    data: {
      verifiedAddresses,
      manualVerifiedAddresses,
      updatedAt: new Date(),
    },
  });

  if (verifiedAddressesChanged) {
    await rematerializeDiscussionNotificationsForProfileFid(fid);
  }
}
