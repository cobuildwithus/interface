import "server-only";

import { unstable_cache } from "next/cache";
import { normalize } from "viem/ens";
import { mainnet } from "viem/chains";
import prisma from "@/lib/server/db/cobuild-db-client";
import { getClient } from "@/lib/domains/token/onchain/clients";
import { isRecord } from "@/lib/server/validation";

export const BUILDERS_PAGE_SIZE = 24;

const HARDCODED_BUILDERS_ENS = ["rocketman21.eth", "riderway.eth"] as const;

export type BuilderAddress = {
  address: string;
  isFounder: boolean;
};

export type BuildersPage = {
  items: BuilderAddress[];
  hasMore: boolean;
};

async function resolveEnsToAddress(ensName: string): Promise<string | null> {
  try {
    const client = getClient(mainnet.id);
    const address = await client.getEnsAddress({ name: normalize(ensName) });
    return address?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

async function getFounderAddresses(): Promise<string[]> {
  const resolved = await Promise.all(HARDCODED_BUILDERS_ENS.map(resolveEnsToAddress));
  return resolved.filter((addr): addr is string => addr !== null);
}

async function getSubmissionBeneficiaryAddresses(): Promise<string[]> {
  const submissions = await prisma.roundSubmission.findMany({
    select: { metadata: true },
    distinct: ["metadata"],
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

  return Array.from(addresses);
}

async function fetchBuilders(
  limit: number = BUILDERS_PAGE_SIZE,
  offset: number = 0
): Promise<BuildersPage> {
  const [founderAddresses, submissionAddresses] = await Promise.all([
    getFounderAddresses(),
    getSubmissionBeneficiaryAddresses(),
  ]);

  const founderSet = new Set(founderAddresses.map((a) => a.toLowerCase()));

  // Combine: founders first, then submission addresses (excluding founders)
  const allAddresses: BuilderAddress[] = [
    ...founderAddresses.map((address) => ({ address, isFounder: true })),
    ...submissionAddresses
      .filter((addr) => !founderSet.has(addr))
      .map((address) => ({ address, isFounder: false })),
  ];

  // Paginate
  const paginated = allAddresses.slice(offset, offset + limit + 1);
  const hasMore = paginated.length > limit;
  const items = hasMore ? paginated.slice(0, limit) : paginated;

  return { items, hasMore };
}

export const getBuilders = unstable_cache(
  (limit?: number, offset?: number) => fetchBuilders(limit, offset),
  ["builders-v1"],
  { revalidate: 300 }
);
