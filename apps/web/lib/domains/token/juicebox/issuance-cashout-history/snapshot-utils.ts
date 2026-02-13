import { toBigInt } from "./helpers";
import type { ChainState, RawCashoutSnapshot } from "./types";

export type SnapshotState = {
  snapshotsByChain: Map<number, RawCashoutSnapshot[]>;
  chainStates: Map<number, ChainState>;
  chainIds: number[];
  globalTaxRate: number;
  globalTaxTimestamp: number;
};

export const groupSnapshotsByChain = (snapshots: RawCashoutSnapshot[]) => {
  const snapshotsByChain = new Map<number, RawCashoutSnapshot[]>();
  for (const snapshot of snapshots) {
    const list = snapshotsByChain.get(snapshot.chainId) ?? [];
    list.push(snapshot);
    if (!snapshotsByChain.has(snapshot.chainId)) snapshotsByChain.set(snapshot.chainId, list);
  }
  return snapshotsByChain;
};

export const initSnapshotState = (snapshots: RawCashoutSnapshot[]): SnapshotState => {
  const snapshotsByChain = groupSnapshotsByChain(snapshots);
  const chainIds = Array.from(snapshotsByChain.keys());
  const chainStates = new Map<number, ChainState>();

  let globalTaxRate = 0;
  let globalTaxTimestamp = 0;
  const firstSnapshot = snapshots[0];
  if (firstSnapshot) {
    globalTaxRate = firstSnapshot.cashOutTaxRate ?? globalTaxRate;
    globalTaxTimestamp = firstSnapshot.timestamp;
  }

  for (const chainId of chainIds) {
    chainStates.set(chainId, {
      index: 0,
      balance: 0n,
      supply: 0n,
      tax: globalTaxRate,
      taxTimestamp: 0,
    });
  }

  return {
    snapshotsByChain,
    chainStates,
    chainIds,
    globalTaxRate,
    globalTaxTimestamp,
  };
};

type ApplySnapshotsResult = {
  sumBalance: bigint;
  sumSupply: bigint;
  globalTaxRate: number;
  globalTaxTimestamp: number;
};

export const applySnapshotsUntil = (
  state: SnapshotState,
  timestampSec: number
): ApplySnapshotsResult => {
  for (const chainId of state.chainIds) {
    const snapshots = state.snapshotsByChain.get(chainId)!;
    const chainState = state.chainStates.get(chainId)!;

    while (
      chainState.index < snapshots.length &&
      snapshots[chainState.index]!.timestamp <= timestampSec
    ) {
      const snapshot = snapshots[chainState.index]!;
      chainState.balance = toBigInt(snapshot.balance);
      chainState.supply = toBigInt(snapshot.totalSupply);
      chainState.tax = snapshot.cashOutTaxRate ?? chainState.tax;
      chainState.taxTimestamp = snapshot.timestamp;
      if (snapshot.timestamp >= state.globalTaxTimestamp) {
        state.globalTaxTimestamp = snapshot.timestamp;
        state.globalTaxRate = chainState.tax;
      }
      chainState.index += 1;
    }

    state.chainStates.set(chainId, chainState);
  }

  let sumBalance = 0n;
  let sumSupply = 0n;
  for (const chainState of state.chainStates.values()) {
    sumBalance += chainState.balance;
    sumSupply += chainState.supply;
  }

  return {
    sumBalance,
    sumSupply,
    globalTaxRate: state.globalTaxRate,
    globalTaxTimestamp: state.globalTaxTimestamp,
  };
};
