import prisma from "@/lib/server/db/cobuild-db-client";
import {
  extractScoreFromNeynarUser,
  neynarFetchUsersByFids,
} from "@/lib/integrations/farcaster/neynar-client";

export async function saveVerifiedAddressForFid(fid: number, rawAddress: `0x${string}`) {
  const address = rawAddress.toLowerCase();

  const existing = await prisma.farcasterProfile.findUnique({
    where: { fid: BigInt(fid) },
    select: { verifiedAddresses: true, manualVerifiedAddresses: true },
  });

  if (!existing) {
    const [user] = await neynarFetchUsersByFids([fid]);
    const score = extractScoreFromNeynarUser(user);

    await prisma.farcasterProfile.create({
      data: {
        fid: BigInt(fid),
        fname: user?.username ?? null,
        displayName: user?.display_name ?? null,
        avatarUrl: user?.pfp_url ?? null,
        bio: null,
        verifiedAddresses: [address],
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
    where: { fid: BigInt(fid) },
    data: {
      verifiedAddresses,
      manualVerifiedAddresses,
      updatedAt: new Date(),
    },
  });
}
