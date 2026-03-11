import prisma from "@/lib/server/db/cobuild-db-client";
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

export async function saveVerifiedAddressForFid(fid: number, rawAddress: `0x${string}`) {
  const address = rawAddress.toLowerCase();
  const profileFid = BigInt(fid);

  const existing = await prisma.farcasterProfile.findUnique({
    where: { fid: profileFid },
    select: { verifiedAddresses: true, manualVerifiedAddresses: true },
  });

  if (!existing) {
    const [user] = await neynarFetchUsersByFids([fid]);
    const score = extractScoreFromNeynarUser(user);
    const verifiedAddresses = Array.from(new Set([address, ...extractVerifiedEthAddresses(user)]));

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
    return;
  }

  if (existing.verifiedAddresses.includes(address)) return;

  const verifiedAddresses = Array.from(new Set([...existing.verifiedAddresses, address]));
  const manualVerifiedAddresses = Array.from(
    new Set([...(existing.manualVerifiedAddresses ?? []), address])
  );

  await prisma.farcasterProfile.update({
    where: { fid: profileFid },
    data: {
      verifiedAddresses,
      manualVerifiedAddresses,
      updatedAt: new Date(),
    },
  });
}
