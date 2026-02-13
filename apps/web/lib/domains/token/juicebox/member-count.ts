import "server-only";

import { unstable_cache } from "next/cache";
import prisma from "@/lib/server/db/cobuild-db-client";
import { getSuckerGroupId } from "@/lib/domains/token/juicebox/project";
import { isRecord } from "@/lib/server/validation";

/**
 * Gets the total count of unique addresses across builders and holders.
 * - Builders: addresses from round submission beneficiaries
 * - Holders: addresses with positive token balance in the Juicebox project
 */
async function fetchUniqueMemberCount(): Promise<number> {
  const suckerGroupId = await getSuckerGroupId();

  // Get unique builder addresses from round submissions
  const submissions = await prisma.roundSubmission.findMany({
    select: { metadata: true },
  });

  const addresses = new Set<string>();

  for (const sub of submissions) {
    const metadata = sub.metadata;
    if (isRecord(metadata) && typeof metadata.beneficiaryAddress === "string") {
      const addr = metadata.beneficiaryAddress.toLowerCase();
      if (addr.startsWith("0x") && addr.length === 42) {
        addresses.add(addr);
      }
    }
  }

  // Get unique holder addresses from Juicebox participants
  if (suckerGroupId) {
    const participants = await prisma.juiceboxParticipant.findMany({
      where: {
        suckerGroupId,
        balance: { gt: 0 },
      },
      select: { address: true },
    });

    for (const p of participants) {
      addresses.add(p.address.toLowerCase());
    }
  }

  return addresses.size;
}

export const getUniqueMemberCount = unstable_cache(
  fetchUniqueMemberCount,
  ["unique-member-count-v1"],
  { revalidate: 300 } // Cache for 5 minutes
);
