import { describe, expect, it } from "vitest";
import { applySnapshotsUntil, groupSnapshotsByChain, initSnapshotState } from "./snapshot-utils";
import type { RawCashoutSnapshot } from "./types";

const makeSnapshot = (overrides: Partial<RawCashoutSnapshot>): RawCashoutSnapshot => ({
  chainId: 1,
  timestamp: 0,
  cashoutA: 0,
  cashoutB: 0,
  balance: 0,
  totalSupply: 0,
  cashOutTaxRate: 0,
  ...overrides,
});

describe("issuance cashout history snapshot-utils", () => {
  it("groups snapshots by chain and preserves per-chain insertion order", () => {
    const snapshots: RawCashoutSnapshot[] = [
      makeSnapshot({ chainId: 1, timestamp: 100 }),
      makeSnapshot({ chainId: 10, timestamp: 110 }),
      makeSnapshot({ chainId: 1, timestamp: 120 }),
    ];

    const grouped = groupSnapshotsByChain(snapshots);

    expect(Array.from(grouped.keys())).toEqual([1, 10]);
    expect(grouped.get(1)?.map((snapshot) => snapshot.timestamp)).toEqual([100, 120]);
    expect(grouped.get(10)?.map((snapshot) => snapshot.timestamp)).toEqual([110]);
  });

  it("initializes global and chain state from snapshots", () => {
    const snapshots: RawCashoutSnapshot[] = [
      makeSnapshot({ chainId: 10, timestamp: 50, cashOutTaxRate: 2500 }),
      makeSnapshot({ chainId: 1, timestamp: 60, cashOutTaxRate: 3000 }),
    ];

    const state = initSnapshotState(snapshots);

    expect(state.globalTaxRate).toBe(2500);
    expect(state.globalTaxTimestamp).toBe(50);
    expect(state.chainIds).toEqual([10, 1]);
    expect(state.chainStates.get(10)).toEqual({
      index: 0,
      balance: 0n,
      supply: 0n,
      tax: 2500,
      taxTimestamp: 0,
    });
    expect(state.chainStates.get(1)).toEqual({
      index: 0,
      balance: 0n,
      supply: 0n,
      tax: 2500,
      taxTimestamp: 0,
    });
  });

  it("initializes empty state when no snapshots are provided", () => {
    const state = initSnapshotState([]);

    expect(state.globalTaxRate).toBe(0);
    expect(state.globalTaxTimestamp).toBe(0);
    expect(state.chainIds).toEqual([]);
    expect(state.chainStates.size).toBe(0);
    expect(state.snapshotsByChain.size).toBe(0);
  });

  it("applies snapshots incrementally and tracks latest global tax across chains", () => {
    const undefinedTaxRate = undefined as unknown as number;
    const snapshots: RawCashoutSnapshot[] = [
      makeSnapshot({
        chainId: 1,
        timestamp: 100,
        balance: 100,
        totalSupply: 10,
        cashOutTaxRate: 1000,
      }),
      makeSnapshot({
        chainId: 10,
        timestamp: 110,
        balance: 200,
        totalSupply: 20,
        cashOutTaxRate: 2000,
      }),
      makeSnapshot({
        chainId: 1,
        timestamp: 120,
        balance: 150,
        totalSupply: 15,
        cashOutTaxRate: undefinedTaxRate,
      }),
      makeSnapshot({
        chainId: 10,
        timestamp: 130,
        balance: 250,
        totalSupply: 25,
        cashOutTaxRate: 1500,
      }),
    ];
    const state = initSnapshotState(snapshots);

    const firstPass = applySnapshotsUntil(state, 115);
    expect(firstPass).toEqual({
      sumBalance: 300n,
      sumSupply: 30n,
      globalTaxRate: 2000,
      globalTaxTimestamp: 110,
    });

    const secondPass = applySnapshotsUntil(state, 125);
    expect(secondPass).toEqual({
      sumBalance: 350n,
      sumSupply: 35n,
      globalTaxRate: 1000,
      globalTaxTimestamp: 120,
    });
    expect(state.chainStates.get(1)?.index).toBe(2);
    expect(state.chainStates.get(10)?.index).toBe(1);

    const thirdPass = applySnapshotsUntil(state, 200);
    expect(thirdPass).toEqual({
      sumBalance: 400n,
      sumSupply: 40n,
      globalTaxRate: 1500,
      globalTaxTimestamp: 130,
    });
    expect(state.chainStates.get(10)?.index).toBe(2);
  });

  it("does not regress global tax when processing older timestamps after a newer chain", () => {
    const snapshots: RawCashoutSnapshot[] = [
      makeSnapshot({
        chainId: 10,
        timestamp: 100,
        balance: 200,
        totalSupply: 20,
        cashOutTaxRate: 3000,
      }),
      makeSnapshot({
        chainId: 1,
        timestamp: 90,
        balance: 100,
        totalSupply: 10,
        cashOutTaxRate: 1200,
      }),
    ];

    const state = initSnapshotState(snapshots);
    const result = applySnapshotsUntil(state, 200);

    expect(result.sumBalance).toBe(300n);
    expect(result.sumSupply).toBe(30n);
    expect(result.globalTaxRate).toBe(3000);
    expect(result.globalTaxTimestamp).toBe(100);
    expect(state.chainStates.get(10)?.tax).toBe(3000);
    expect(state.chainStates.get(1)?.tax).toBe(1200);
  });
});
