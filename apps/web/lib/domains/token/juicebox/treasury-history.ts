import "server-only";

import { unstable_cache } from "next/cache";
import juiceboxDb from "@/lib/server/db/cobuild-db-client";
import { COBUILD_JUICEBOX_PROJECT_ID } from "@/lib/domains/token/juicebox/constants";
import { getProject } from "@/lib/domains/token/juicebox/project";
import { fromBaseUnits } from "@/lib/shared/numbers";

const PROJECT_ID = COBUILD_JUICEBOX_PROJECT_ID;

// 6-hour buckets for aggregation
const BUCKET_SIZE_MS = 6 * 60 * 60 * 1000;

export type TreasuryDataPoint = {
  timestamp: number; // unix ms
  balance: number; // cumulative balance in accounting token
};

export type TreasuryHistory = {
  data: TreasuryDataPoint[];
  symbol: string;
};

async function fetchTreasuryHistory(): Promise<TreasuryHistory> {
  const project = await getProject();

  if (!project.suckerGroupId) {
    return { data: [], symbol: project.accountingTokenSymbol };
  }

  // Fetch all pay events ordered by timestamp ascending.
  // Filter by newlyIssuedTokenCount > 0 so AMM buybacks don't inflate treasury.
  const payments = await juiceboxDb.juiceboxPayEvent.findMany({
    select: {
      timestamp: true,
      amount: true,
    },
    where: {
      suckerGroupId: project.suckerGroupId,
      newlyIssuedTokenCount: { gt: 0 },
    },
    orderBy: { timestamp: "asc" },
  });

  if (payments.length === 0) {
    return { data: [], symbol: project.accountingTokenSymbol };
  }

  // Aggregate into 6-hour buckets with cumulative balance
  const buckets = new Map<number, number>();
  let cumulativeBalance = 0;

  for (const payment of payments) {
    const timestampMs = payment.timestamp * 1000;
    const bucketKey = Math.floor(timestampMs / BUCKET_SIZE_MS) * BUCKET_SIZE_MS;
    const amount = fromBaseUnits(payment.amount, project.accountingDecimals);
    cumulativeBalance += amount;
    buckets.set(bucketKey, cumulativeBalance);
  }

  // Convert to array and fill gaps between buckets
  const sortedBuckets = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);

  if (sortedBuckets.length === 0) {
    return { data: [], symbol: project.accountingTokenSymbol };
  }

  const data: TreasuryDataPoint[] = [];
  let lastBalance = 0;

  const firstBucket = sortedBuckets[0]![0];
  const lastBucket = sortedBuckets[sortedBuckets.length - 1]![0];

  // Create a map for quick lookup
  const bucketMap = new Map(sortedBuckets);

  // Fill in all buckets from first to last (including gaps)
  for (let bucket = firstBucket; bucket <= lastBucket; bucket += BUCKET_SIZE_MS) {
    if (bucketMap.has(bucket)) {
      lastBalance = bucketMap.get(bucket)!;
    }
    data.push({
      timestamp: bucket,
      balance: lastBalance,
    });
  }

  return { data, symbol: project.accountingTokenSymbol };
}

export const getTreasuryHistory = unstable_cache(
  fetchTreasuryHistory,
  ["treasury-history-v3", String(PROJECT_ID)],
  { revalidate: 300 } // Cache for 5 minutes
);
