import "server-only";

import { unstable_cache } from "next/cache";
import juiceboxDb from "@/lib/server/db/cobuild-db-client";
import { getProject } from "@/lib/domains/token/juicebox/project";
import { fromBaseUnits } from "@/lib/shared/numbers";
import type {
  BucketedHolders,
  BucketedPayments,
  HoldersDataPoint,
  HoldersHistory,
} from "./holders-history/types";
import { PROJECT_ID } from "./holders-history/constants";
import {
  bucketKey,
  calculateMedian,
  chooseBucketSizeMs,
  minDefined,
} from "./holders-history/utils";

export type { HoldersDataPoint, HoldersHistory } from "./holders-history/types";

async function fetchHoldersHistory(): Promise<HoldersHistory> {
  const project = await getProject();

  if (!project.suckerGroupId) {
    return { data: [], symbol: project.accountingTokenSymbol };
  }

  // Fetch all participants with their first ownership timestamp
  const participants = await juiceboxDb.juiceboxParticipant.findMany({
    select: {
      address: true,
      firstOwned: true,
      createdAt: true,
    },
    where: {
      suckerGroupId: project.suckerGroupId,
      balance: { gt: 0 },
    },
  });

  if (participants.length === 0) {
    return { data: [], symbol: project.accountingTokenSymbol };
  }

  const holderSet = new Set(participants.map((participant) => participant.address));

  // Fetch all pay events with payer info for per-payer contribution tracking
  const payments = await juiceboxDb.juiceboxPayEvent.findMany({
    select: {
      timestamp: true,
      amount: true,
      payer: true,
    },
    where: {
      suckerGroupId: project.suckerGroupId,
      effectiveTokenCount: { gt: 0 },
    },
    orderBy: { timestamp: "asc" },
  });

  const holderPayments: { timestampMs: number; payer: string; amount: number }[] = [];
  const earliestPaymentByHolder = new Map<string, number>();
  let minPaymentMs: number | null = null;
  let maxPaymentMs: number | null = null;

  for (const payment of payments) {
    if (!holderSet.has(payment.payer)) continue;
    const timestampMs = payment.timestamp * 1000;
    const amount = fromBaseUnits(payment.amount, project.accountingDecimals);

    const earliestPayment = earliestPaymentByHolder.get(payment.payer);
    if (earliestPayment === undefined || timestampMs < earliestPayment) {
      earliestPaymentByHolder.set(payment.payer, timestampMs);
    }

    holderPayments.push({ timestampMs, payer: payment.payer, amount });
    minPaymentMs = minPaymentMs === null ? timestampMs : Math.min(minPaymentMs, timestampMs);
    maxPaymentMs = maxPaymentMs === null ? timestampMs : Math.max(maxPaymentMs, timestampMs);
  }

  let minActivationMs: number | null = null;
  let maxActivationMs: number | null = null;
  const holderBuckets: BucketedHolders = new Map();
  for (const participant of participants) {
    const firstOwnedMs = participant.firstOwned !== null ? participant.firstOwned * 1000 : null;
    const paymentMs = earliestPaymentByHolder.get(participant.address) ?? null;
    const activationMs = minDefined(firstOwnedMs, paymentMs) ?? participant.createdAt * 1000;
    minActivationMs =
      minActivationMs === null ? activationMs : Math.min(minActivationMs, activationMs);
    maxActivationMs =
      maxActivationMs === null ? activationMs : Math.max(maxActivationMs, activationMs);
  }

  const minTimestamp = minDefined(minActivationMs, minPaymentMs);
  const maxTimestamp = minDefined(maxActivationMs, maxPaymentMs) ?? minTimestamp ?? Date.now();
  const bucketSizeMs = chooseBucketSizeMs(minTimestamp ?? maxTimestamp, maxTimestamp);

  for (const participant of participants) {
    const firstOwnedMs = participant.firstOwned !== null ? participant.firstOwned * 1000 : null;
    const paymentMs = earliestPaymentByHolder.get(participant.address) ?? null;
    const activationMs = minDefined(firstOwnedMs, paymentMs) ?? participant.createdAt * 1000;
    const holderBucket = bucketKey(activationMs, bucketSizeMs);
    const bucketHolders = holderBuckets.get(holderBucket);
    if (bucketHolders) {
      bucketHolders.push(participant.address);
    } else {
      holderBuckets.set(holderBucket, [participant.address]);
    }
  }

  const paymentBuckets: BucketedPayments = new Map();
  for (const payment of holderPayments) {
    const paymentBucket = bucketKey(payment.timestampMs, bucketSizeMs);
    const bucketPayments = paymentBuckets.get(paymentBucket);
    if (bucketPayments) {
      bucketPayments.push({ payer: payment.payer, amount: payment.amount });
    } else {
      paymentBuckets.set(paymentBucket, [{ payer: payment.payer, amount: payment.amount }]);
    }
  }

  const allBuckets = new Set([...holderBuckets.keys(), ...paymentBuckets.keys()]);
  const sortedBuckets = Array.from(allBuckets).sort((a, b) => a - b);

  if (sortedBuckets.length === 0) {
    return { data: [], symbol: project.accountingTokenSymbol };
  }

  const firstBucket = sortedBuckets[0]!;
  const lastBucket = sortedBuckets[sortedBuckets.length - 1]!;

  const holdersByBucket = new Map<number, number>();
  const medianByBucket = new Map<number, number>();
  const activeHolders = new Set<string>();
  const contributions = new Map<string, number>();

  for (const bucket of sortedBuckets) {
    const bucketHolders = holderBuckets.get(bucket);
    if (bucketHolders) {
      for (const address of bucketHolders) {
        activeHolders.add(address);
        if (!contributions.has(address)) {
          contributions.set(address, 0);
        }
      }
    }

    const bucketPayments = paymentBuckets.get(bucket);
    if (bucketPayments) {
      for (const payment of bucketPayments) {
        const current = contributions.get(payment.payer) ?? 0;
        contributions.set(payment.payer, current + payment.amount);
      }
    }

    const holderValues: number[] = [];
    for (const address of activeHolders) {
      const contribution = contributions.get(address) ?? 0;
      if (contribution > 0) {
        holderValues.push(contribution);
      }
    }

    holdersByBucket.set(bucket, activeHolders.size);
    medianByBucket.set(bucket, calculateMedian(holderValues));
  }

  // Fill in all buckets from first to last
  const data: HoldersDataPoint[] = [];
  let lastHolders = 0;
  let lastMedian = 0;

  for (let bucket = firstBucket; bucket <= lastBucket; bucket += bucketSizeMs) {
    if (holdersByBucket.has(bucket)) {
      lastHolders = holdersByBucket.get(bucket)!;
    }
    if (medianByBucket.has(bucket)) {
      lastMedian = medianByBucket.get(bucket)!;
    }

    data.push({
      timestamp: bucket,
      holders: lastHolders,
      medianContribution: lastMedian,
    });
  }

  // Add current timestamp as final point
  const now = Date.now();
  const currentBucket = bucketKey(now, bucketSizeMs);
  if (currentBucket > lastBucket) {
    data.push({
      timestamp: now,
      holders: lastHolders,
      medianContribution: lastMedian,
    });
  }

  return { data, symbol: project.accountingTokenSymbol };
}

export const getHoldersHistory = unstable_cache(
  fetchHoldersHistory,
  ["holders-history-v5", String(PROJECT_ID)],
  { revalidate: 300 } // Cache for 5 minutes
);
