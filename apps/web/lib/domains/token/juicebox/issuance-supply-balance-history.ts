import "server-only";

import { unstable_cache } from "next/cache";
import { base } from "viem/chains";
import juiceboxDb from "@/lib/server/db/cobuild-db-client";
import { COBUILD_JUICEBOX_PROJECT_ID } from "@/lib/domains/token/juicebox/constants";
import { getProject } from "@/lib/domains/token/juicebox/project";
import { toBigIntSafe, fromBaseUnits, type Numberish } from "@/lib/shared/numbers";

const PROJECT_ID = COBUILD_JUICEBOX_PROJECT_ID;
const BUCKET_SIZE_MS = 6 * 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

type RawSnapshot = {
  chainId: number;
  timestamp: number;
  balance: Numberish;
  totalSupply: Numberish;
};

export type SupplyBalanceDataPoint = {
  timestamp: number; // unix ms
  totalSupply: number; // tokens
  totalBalance: number; // accounting token
};

export type SupplyBalanceHistory = {
  data: SupplyBalanceDataPoint[];
  baseSymbol: string;
  tokenSymbol: string;
};

function toBigInt(value: Numberish): bigint {
  try {
    return toBigIntSafe(value);
  } catch {
    return 0n;
  }
}

function applySnapshotsThrough(
  chainIds: number[],
  snapshotsByChain: Map<number, RawSnapshot[]>,
  chainStates: Map<number, { index: number; balance: bigint; supply: bigint }>,
  endSec: number
): void {
  for (const chainId of chainIds) {
    const list = snapshotsByChain.get(chainId)!;
    const state = chainStates.get(chainId)!;
    while (state.index < list.length && list[state.index]!.timestamp <= endSec) {
      const snapshot = list[state.index]!;
      state.balance = toBigInt(snapshot.balance);
      state.supply = toBigInt(snapshot.totalSupply);
      state.index += 1;
    }
    chainStates.set(chainId, state);
  }
}

function sumChainStates(
  chainStates: Map<number, { index: number; balance: bigint; supply: bigint }>
): { totalBalance: bigint; totalSupply: bigint } {
  let totalBalance = 0n;
  let totalSupply = 0n;
  for (const state of chainStates.values()) {
    totalBalance += state.balance;
    totalSupply += state.supply;
  }
  return { totalBalance, totalSupply };
}

async function fetchSupplyBalanceHistoryBase(): Promise<SupplyBalanceHistory> {
  const project = await getProject();

  const snapshotWhere = project.suckerGroupId
    ? { suckerGroupId: project.suckerGroupId }
    : { chainId: base.id, projectId: PROJECT_ID };

  const snapshots = (await juiceboxDb.juiceboxCashoutCoefficientSnapshot.findMany({
    select: {
      chainId: true,
      timestamp: true,
      balance: true,
      totalSupply: true,
    },
    where: snapshotWhere,
    orderBy: [{ timestamp: "asc" }, { txHash: "asc" }],
  })) as RawSnapshot[];

  const baseSymbol = project.accountingTokenSymbol;
  const tokenSymbol = project.erc20Symbol ?? "TOKEN";

  if (snapshots.length === 0) {
    return { data: [], baseSymbol, tokenSymbol };
  }

  const snapshotsByChain = new Map<number, RawSnapshot[]>();
  for (const snapshot of snapshots) {
    const list = snapshotsByChain.get(snapshot.chainId) ?? [];
    list.push(snapshot);
    if (!snapshotsByChain.has(snapshot.chainId)) snapshotsByChain.set(snapshot.chainId, list);
  }

  const startMs = snapshots[0]!.timestamp * 1000;
  const endMs = snapshots[snapshots.length - 1]!.timestamp * 1000;
  const startBucket = Math.floor(startMs / BUCKET_SIZE_MS) * BUCKET_SIZE_MS;
  const endBucket = Math.floor(endMs / BUCKET_SIZE_MS) * BUCKET_SIZE_MS;

  const chainStates = new Map<number, { index: number; balance: bigint; supply: bigint }>();
  for (const chainId of snapshotsByChain.keys()) {
    chainStates.set(chainId, { index: 0, balance: 0n, supply: 0n });
  }

  const data: SupplyBalanceDataPoint[] = [];
  const chainIds = Array.from(snapshotsByChain.keys());

  for (let bucket = startBucket; bucket <= endBucket; bucket += BUCKET_SIZE_MS) {
    const bucketSec = Math.floor(bucket / 1000);

    applySnapshotsThrough(chainIds, snapshotsByChain, chainStates, bucketSec);
    const { totalBalance, totalSupply } = sumChainStates(chainStates);

    data.push({
      timestamp: bucket,
      totalSupply: fromBaseUnits(totalSupply, TOKEN_DECIMALS),
      totalBalance: fromBaseUnits(totalBalance, project.accountingDecimals),
    });
  }

  if (endMs > endBucket) {
    const endSec = Math.floor(endMs / 1000);

    applySnapshotsThrough(chainIds, snapshotsByChain, chainStates, endSec);
    const { totalBalance, totalSupply } = sumChainStates(chainStates);

    data.push({
      timestamp: endMs,
      totalSupply: fromBaseUnits(totalSupply, TOKEN_DECIMALS),
      totalBalance: fromBaseUnits(totalBalance, project.accountingDecimals),
    });
  }

  return { data, baseSymbol, tokenSymbol };
}

async function fetchSupplyBalanceHistory(): Promise<SupplyBalanceHistory> {
  const baseHistory = await fetchSupplyBalanceHistoryBase();
  if (baseHistory.data.length === 0) return baseHistory;

  const now = Date.now();
  const last = baseHistory.data[baseHistory.data.length - 1]!;
  if (now <= last.timestamp) return baseHistory;

  return {
    ...baseHistory,
    data: [
      ...baseHistory.data,
      {
        timestamp: now,
        totalSupply: last.totalSupply,
        totalBalance: last.totalBalance,
      },
    ],
  };
}

export const getSupplyBalanceHistoryBase = unstable_cache(
  fetchSupplyBalanceHistoryBase,
  ["issuance-supply-balance-history-base-v1", String(PROJECT_ID)],
  { revalidate: 300 }
);

export const getSupplyBalanceHistory = unstable_cache(
  fetchSupplyBalanceHistory,
  ["issuance-supply-balance-history-v1", String(PROJECT_ID)],
  { revalidate: 300 }
);
