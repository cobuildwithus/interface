import { describe, expect, it, vi, beforeEach } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";
import { base } from "viem/chains";

vi.mock("server-only", () => ({}));

const projectMock = vi.fn();
const rulesetMock = vi.fn();
const snapshotsMock = vi.fn();
const payEventsMock = vi.fn();

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    juiceboxProject: {
      findUniqueOrThrow: (...args: Parameters<typeof projectMock>) => projectMock(...args),
    },
    juiceboxRuleset: {
      findMany: (...args: Parameters<typeof rulesetMock>) => rulesetMock(...args),
    },
    juiceboxCashoutCoefficientSnapshot: {
      findMany: (...args: Parameters<typeof snapshotsMock>) => snapshotsMock(...args),
    },
    juiceboxPayEvent: {
      findMany: (...args: Parameters<typeof payEventsMock>) => payEventsMock(...args),
    },
  },
}));

const passthroughCache = vi.hoisted(
  () =>
    ((
      fn: Parameters<typeof unstableCache>[0],
      _keyParts?: Parameters<typeof unstableCache>[1],
      _options?: Parameters<typeof unstableCache>[2]
    ) => fn) as typeof unstableCache
);
vi.mock("next/cache", () => ({
  unstable_cache: passthroughCache,
}));

import {
  getIssuanceCashoutHistory,
  getIssuanceCashoutHistoryBase,
} from "@/lib/domains/token/juicebox/issuance-cashout-history";

describe("issuance-cashout-history", () => {
  beforeEach(() => {
    projectMock.mockReset();
    rulesetMock.mockReset();
    snapshotsMock.mockReset();
    payEventsMock.mockReset();
  });

  it("computes history from pay events when no snapshots", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("1970-01-01T13:00:00Z"));

    projectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
      erc20Symbol: "COB",
      cashoutA: 1n,
      cashoutB: 0n,
      balance: 0,
      erc20Supply: 0,
      pendingReservedTokens: 0,
    });

    rulesetMock.mockResolvedValue([
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 1n,
        start: 0n,
        duration: 0n,
        weight: 1_000_000_000_000_000_000n,
        weightCutPercent: 0,
        reservedPercent: 10000,
        cashOutTaxRate: 5000,
      },
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 2n,
        start: 100n,
        duration: 0n,
        weight: 1_000_000_000_000_000_000n,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 5000,
      },
    ]);

    snapshotsMock.mockResolvedValue([]);
    payEventsMock.mockResolvedValue([
      {
        timestamp: 0,
        amount: 10000,
        effectiveTokenCount: 1000,
        newlyIssuedTokenCount: 1000,
        rulesetId: 1n,
        chainId: base.id,
      },
      {
        timestamp: 21600,
        amount: 5000,
        effectiveTokenCount: 500,
        newlyIssuedTokenCount: 500,
        rulesetId: 3n,
        chainId: base.id,
      },
      {
        timestamp: 46800,
        amount: "bad",
        effectiveTokenCount: 250,
        newlyIssuedTokenCount: 250,
        rulesetId: 1n,
        chainId: base.id,
      },
    ]);

    const result = await getIssuanceCashoutHistory();

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]?.issuancePrice).toBeGreaterThan(0);
    expect(result.data[result.data.length - 1]?.cashOutValue).toBeCloseTo(0.01);

    vi.useRealTimers();
  });

  it("computes history from cashout snapshots", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("1970-01-01T13:00:00Z"));

    projectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
      erc20Symbol: "COB",
      cashoutA: 0,
      cashoutB: 0,
      balance: 0,
      erc20Supply: 0,
      pendingReservedTokens: 0,
    });

    rulesetMock.mockResolvedValue([
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 1n,
        start: 0n,
        duration: 0n,
        weight: 1_000_000_000_000_000_000n,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 4000,
      },
    ]);

    snapshotsMock.mockResolvedValue([
      {
        chainId: base.id,
        timestamp: 0,
        cashoutA: 0,
        cashoutB: 0,
        balance: 10000,
        totalSupply: 1000,
        cashOutTaxRate: 4000,
      },
      {
        chainId: 10,
        timestamp: 21600,
        cashoutA: 0,
        cashoutB: 0,
        balance: 20000,
        totalSupply: 2000,
        cashOutTaxRate: 6000,
      },
      {
        chainId: base.id,
        timestamp: 45000,
        cashoutA: 0,
        cashoutB: 0,
        balance: 15000,
        totalSupply: 1500,
        cashOutTaxRate: 6000,
      },
    ]);

    const result = await getIssuanceCashoutHistory();

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]?.cashOutValue).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it("returns empty history when no rulesets", async () => {
    projectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 18,
      erc20Symbol: "COB",
      cashoutA: 0,
      cashoutB: 0,
      balance: 0,
      erc20Supply: 0,
      pendingReservedTokens: 0,
    });
    rulesetMock.mockResolvedValue([]);

    const result = await getIssuanceCashoutHistory();
    expect(result.data).toEqual([]);
  });

  it("handles missing payments and zero-weight rulesets", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("1970-01-01T00:01:00Z"));

    projectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 18,
      erc20Symbol: "COB",
      cashoutA: 0,
      cashoutB: 0,
      balance: 0,
      erc20Supply: 0,
      pendingReservedTokens: 0,
    });
    rulesetMock.mockResolvedValue([
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 1n,
        start: 0n,
        duration: 0n,
        weight: 0,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
    ]);
    snapshotsMock.mockResolvedValue([]);
    payEventsMock.mockResolvedValue([]);

    const result = await getIssuanceCashoutHistory();
    expect(result.data).toEqual([]);

    vi.useRealTimers();
  });

  it("falls back when no payments but weight is positive", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("1970-01-01T00:10:00Z"));

    projectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 18,
      erc20Symbol: "COB",
      cashoutA: 0,
      cashoutB: 0,
      balance: 0,
      erc20Supply: 0,
      pendingReservedTokens: 0,
    });
    rulesetMock.mockResolvedValue([
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 1n,
        start: 0n,
        duration: 0n,
        weight: 1_000_000_000_000_000_000n,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
    ]);
    snapshotsMock.mockResolvedValue([]);
    payEventsMock.mockResolvedValue([]);

    const result = await getIssuanceCashoutHistory();
    expect(result.data.length).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it("processes late payments with fallback ruleset", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("1970-01-01T01:00:00Z"));

    projectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 18,
      erc20Symbol: "COB",
      cashoutA: 0,
      cashoutB: 0,
      balance: 0,
      erc20Supply: 0,
      pendingReservedTokens: 0,
    });
    rulesetMock.mockResolvedValue([
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 1n,
        start: 0n,
        duration: 0n,
        weight: 1_000_000_000_000_000_000n,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 2n,
        start: 100n,
        duration: 0n,
        weight: 1_000_000_000_000_000_000n,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
    ]);
    snapshotsMock.mockResolvedValue([]);
    payEventsMock.mockResolvedValue([
      {
        timestamp: 3600,
        amount: 1000,
        effectiveTokenCount: 100,
        newlyIssuedTokenCount: 100,
        rulesetId: 999n,
        chainId: base.id,
      },
    ]);

    const result = await getIssuanceCashoutHistory();
    expect(result.data.length).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it("uses snapshot fallback with sucker group rulesets", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("1970-01-01T00:05:00Z"));

    projectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      accountingTokenSymbol: "ETH",
      accountingDecimals: 18,
      erc20Symbol: "COB",
      cashoutA: 0,
      cashoutB: 0,
      balance: 1000,
      erc20Supply: 1000,
      pendingReservedTokens: 0,
    });
    rulesetMock.mockResolvedValue([
      {
        chainId: 10,
        projectId: 6,
        rulesetId: 1n,
        start: 0n,
        duration: 0n,
        weight: 1_000_000_000_000_000_000n,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 5000,
      },
    ]);
    snapshotsMock.mockResolvedValue([]);
    payEventsMock.mockResolvedValue([]);

    const result = await getIssuanceCashoutHistory();
    expect(result.data.length).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it("handles undefined snapshots and payments", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("1970-01-01T00:05:00Z"));

    projectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 18,
      erc20Symbol: "COB",
      cashoutA: 0,
      cashoutB: 0,
      balance: 0,
      erc20Supply: 0,
      pendingReservedTokens: 0,
    });
    rulesetMock.mockResolvedValue([
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 1n,
        start: 0n,
        duration: 0n,
        weight: 1_000_000_000_000_000_000n,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
    ]);
    snapshotsMock.mockResolvedValue(undefined);
    payEventsMock.mockResolvedValue(undefined);

    const result = await getIssuanceCashoutHistory();
    expect(result.data.length).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it("returns empty base history when no rulesets", async () => {
    projectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
      erc20Symbol: "COB",
      cashoutA: 1n,
      cashoutB: 0n,
      balance: 0,
      erc20Supply: 0,
      pendingReservedTokens: 0,
    });

    rulesetMock.mockResolvedValue([]);
    snapshotsMock.mockResolvedValue([]);
    payEventsMock.mockResolvedValue([]);

    const result = await getIssuanceCashoutHistoryBase();
    expect(result.data).toEqual([]);
  });

  it("computes base history without relying on system time", async () => {
    projectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
      erc20Symbol: "COB",
      cashoutA: 1n,
      cashoutB: 0n,
      balance: 0,
      erc20Supply: 0,
      pendingReservedTokens: 0,
    });

    rulesetMock.mockResolvedValue([
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 1n,
        start: 0n,
        duration: 0n,
        weight: 1_000_000_000_000_000_000n,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 5000,
      },
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 2n,
        start: 21600n,
        duration: 0n,
        weight: 1_000_000_000_000_000_000n,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 5000,
      },
    ]);

    snapshotsMock.mockResolvedValue([]);
    payEventsMock.mockResolvedValue([]);

    const result = await getIssuanceCashoutHistoryBase();

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[result.data.length - 1]?.timestamp).toBe(21600 * 1000);
  });

  it("computes base history from snapshots when available", async () => {
    projectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
      erc20Symbol: "COB",
      cashoutA: 1n,
      cashoutB: 0n,
      balance: 0,
      erc20Supply: 0,
      pendingReservedTokens: 0,
    });

    rulesetMock.mockResolvedValue([
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 1n,
        start: 0n,
        duration: 0n,
        weight: 1_000_000_000_000_000_000n,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 5000,
      },
    ]);

    snapshotsMock.mockResolvedValue([
      {
        chainId: base.id,
        timestamp: 21600,
        cashoutA: 1n,
        cashoutB: 0n,
        balance: 10000,
        totalSupply: 1000,
        cashOutTaxRate: 5000,
      },
    ]);
    payEventsMock.mockResolvedValue([]);

    const result = await getIssuanceCashoutHistoryBase();

    expect(result.data.length).toBeGreaterThan(0);
    expect(payEventsMock).not.toHaveBeenCalled();
  });
});
