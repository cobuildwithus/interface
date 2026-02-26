import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";
import { NATIVE_TOKEN } from "@/lib/domains/token/onchain/revnet";

vi.mock("server-only", () => ({}));

const passthroughCache: typeof unstableCache = (fn, _keyParts, _options) => fn;
vi.mock("next/cache", () => ({
  unstable_cache: passthroughCache,
}));

const getProjectMock = vi.fn();
const getTreasuryHistoryMock = vi.fn();
const getIssuanceTermsMock = vi.fn();
const getSupplyBalanceHistoryMock = vi.fn();
const getHoldersHistoryMock = vi.fn();
const getParticipantsMock = vi.fn();
const getEthPriceUsdcMock = vi.fn();
const tokenMetadataFindUniqueMock = vi.fn();
const payEventFindManyMock = vi.fn();

vi.mock("@/lib/domains/token/juicebox/project", () => ({
  getProject: (...args: Parameters<typeof getProjectMock>) => getProjectMock(...args),
}));

vi.mock("@/lib/domains/token/juicebox/treasury-history", () => ({
  getTreasuryHistory: (...args: Parameters<typeof getTreasuryHistoryMock>) =>
    getTreasuryHistoryMock(...args),
}));

vi.mock("@/lib/domains/token/juicebox/issuance-terms", () => ({
  getIssuanceTerms: (...args: Parameters<typeof getIssuanceTermsMock>) =>
    getIssuanceTermsMock(...args),
}));

vi.mock("@/lib/domains/token/juicebox/issuance-supply-balance-history", () => ({
  getSupplyBalanceHistory: (...args: Parameters<typeof getSupplyBalanceHistoryMock>) =>
    getSupplyBalanceHistoryMock(...args),
}));

vi.mock("@/lib/domains/token/juicebox/holders-history", () => ({
  getHoldersHistory: (...args: Parameters<typeof getHoldersHistoryMock>) =>
    getHoldersHistoryMock(...args),
}));

vi.mock("@/lib/domains/token/juicebox/participants", () => ({
  getParticipants: (...args: Parameters<typeof getParticipantsMock>) =>
    getParticipantsMock(...args),
}));

vi.mock("@/lib/domains/token/onchain/eth-price", () => ({
  getEthPriceUsdc: (...args: Parameters<typeof getEthPriceUsdcMock>) =>
    getEthPriceUsdcMock(...args),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    tokenMetadata: {
      findUnique: (...args: Parameters<typeof tokenMetadataFindUniqueMock>) =>
        tokenMetadataFindUniqueMock(...args),
    },
    juiceboxPayEvent: {
      findMany: (...args: Parameters<typeof payEventFindManyMock>) => payEventFindManyMock(...args),
    },
  },
}));

describe("goal-ai-context", () => {
  beforeEach(() => {
    getProjectMock.mockReset();
    getTreasuryHistoryMock.mockReset();
    getIssuanceTermsMock.mockReset();
    getSupplyBalanceHistoryMock.mockReset();
    getHoldersHistoryMock.mockReset();
    getParticipantsMock.mockReset();
    getEthPriceUsdcMock.mockReset();
    tokenMetadataFindUniqueMock.mockReset();
    payEventFindManyMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds stats with ETH pricing, mints, and distribution", async () => {
    vi.useFakeTimers();
    const now = new Date("2025-01-31T00:00:00Z");
    vi.setSystemTime(now);

    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      accountingToken: NATIVE_TOKEN,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 18,
      erc20Symbol: "COBUILD",
      erc20: null,
    });

    getTreasuryHistoryMock.mockResolvedValue({
      symbol: "ETH",
      data: [
        { timestamp: new Date("2024-12-22T00:00:00Z").getTime(), balance: 10 },
        { timestamp: new Date("2025-01-26T00:00:00Z").getTime(), balance: 30 },
        { timestamp: new Date("2025-01-30T00:00:00Z").getTime(), balance: 50 },
      ],
    });

    getIssuanceTermsMock.mockResolvedValue({
      baseSymbol: "ETH",
      tokenSymbol: "COBUILD",
      stages: [
        {
          stage: 1,
          start: new Date("2025-01-01T00:00:00Z").getTime(),
          end: null,
          duration: 0,
          weight: 5,
          weightCutPercent: 0,
          reservedPercent: 5000,
          cashOutTaxRate: 2500,
        },
      ],
      chartData: [],
      chartStart: 0,
      chartEnd: 0,
      now: now.getTime(),
      activeStageIndex: 0,
      summary: {
        currentIssuance: 5,
        nextIssuance: 4,
        nextChangeAt: new Date("2025-02-10T00:00:00Z").getTime(),
        nextChangeType: "stage",
        reservedPercent: 5000,
        activeStage: 1,
        nextStage: 2,
      },
    });

    getSupplyBalanceHistoryMock.mockResolvedValue({
      baseSymbol: "ETH",
      tokenSymbol: "COBUILD",
      data: [
        {
          timestamp: new Date("2025-01-30T00:00:00Z").getTime(),
          totalSupply: 100,
          totalBalance: 50,
        },
      ],
    });

    getHoldersHistoryMock.mockResolvedValue({
      symbol: "ETH",
      data: [
        {
          timestamp: new Date("2024-12-15T00:00:00Z").getTime(),
          holders: 2,
          medianContribution: 0.5,
        },
        {
          timestamp: new Date("2025-01-26T00:00:00Z").getTime(),
          holders: 5,
          medianContribution: 1.5,
        },
      ],
    });

    getParticipantsMock.mockResolvedValue({
      items: [
        { address: "0x1", balance: "30000000000000000000", createdAt: 0, firstOwned: 0 },
        { address: "0x2", balance: "10000000000000000000", createdAt: 0, firstOwned: 0 },
      ],
      hasMore: false,
      tokenSymbol: "COBUILD",
    });

    getEthPriceUsdcMock.mockResolvedValue(2000);

    payEventFindManyMock.mockResolvedValue([
      {
        timestamp: Math.floor(new Date("2025-01-29T00:00:00Z").getTime() / 1000),
        payer: "0xaaa",
        amount: 1_000_000_000_000_000_000n,
        effectiveTokenCount: 10_000_000_000_000_000_000n,
      },
      {
        timestamp: Math.floor(new Date("2025-01-21T00:00:00Z").getTime() / 1000),
        payer: "0xbbb",
        amount: 4_000_000_000_000_000_000n,
        effectiveTokenCount: 20_000_000_000_000_000_000n,
      },
      {
        timestamp: Math.floor(new Date("2024-12-10T00:00:00Z").getTime() / 1000),
        payer: "0xbbb",
        amount: 1_000_000_000_000_000_000n,
        effectiveTokenCount: 5_000_000_000_000_000_000n,
      },
    ]);

    const { getCobuildAiContext } = await import("./context");

    const result = await getCobuildAiContext();

    expect(result.goalAddress).toBe("");
    expect(result.prompt).toContain("/api/cobuild/ai-context");
    expect(result.data.baseAsset.priceUsd).toBe(2000);
    expect(result.data.treasury.inflow.last6h).toBeCloseTo(0, 4);
    expect(result.data.treasury.inflow.last24h).toBeCloseTo(0, 4);
    expect(result.data.treasury.inflow.last7d).toBeCloseTo(40, 4);
    expect(result.data.treasury.inflow.last30d).toBeCloseTo(40, 4);
    expect(result.data.treasury.paceWeekly.last30d).toBeCloseTo(9.33, 2);
    expect(result.data.issuance.currentPrice.basePerToken).toBeCloseTo(0.2, 4);
    expect(result.data.issuance.nextPrice.basePerToken).toBeCloseTo(0.25, 4);
    expect(result.data.mints.count.last6h).toBe(0);
    expect(result.data.mints.count.last24h).toBe(0);
    expect(result.data.mints.count.last7d).toBe(1);
    expect(result.data.mints.count.last30d).toBe(2);
    expect(result.data.mints.uniqueMinters.last30d).toBe(2);
    const median30d = result.data.mints.medianPrice.last30d;
    expect(median30d?.basePerToken).toBeCloseTo(0.15, 4);
    expect(result.data.holders.total).toBe(5);
    expect(result.data.holders.new.last6h).toBe(0);
    expect(result.data.holders.new.last24h).toBe(0);
    expect(result.data.holders.new.last7d).toBe(3);
    expect(result.data.distribution.top10Share).toBeCloseTo(0.4, 4);
    expect(tokenMetadataFindUniqueMock).not.toHaveBeenCalled();
  });

  it("handles empty datasets and non-ETH base pricing", async () => {
    vi.useFakeTimers();
    const now = new Date("2025-01-31T00:00:00Z");
    vi.setSystemTime(now);

    getProjectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingToken: "0x9999999999999999999999999999999999999999",
      accountingTokenSymbol: "USDC",
      accountingDecimals: 6,
      erc20Symbol: "COB",
      erc20: null,
    });

    getTreasuryHistoryMock.mockResolvedValue({ symbol: "USDC", data: [] });
    getIssuanceTermsMock.mockResolvedValue({
      baseSymbol: "USDC",
      tokenSymbol: "COB",
      stages: [],
      chartData: [],
      chartStart: 0,
      chartEnd: 0,
      now: now.getTime(),
      activeStageIndex: null,
      summary: {
        currentIssuance: null,
        nextIssuance: null,
        nextChangeAt: null,
        nextChangeType: null,
        reservedPercent: null,
        activeStage: null,
        nextStage: null,
      },
    });
    getSupplyBalanceHistoryMock.mockResolvedValue({
      baseSymbol: "USDC",
      tokenSymbol: "COB",
      data: [],
    });
    getHoldersHistoryMock.mockResolvedValue({ symbol: "USDC", data: [] });
    getParticipantsMock.mockResolvedValue({ items: [], hasMore: false, tokenSymbol: "COB" });

    tokenMetadataFindUniqueMock.mockResolvedValue({ priceUsdc: 1.25 });
    payEventFindManyMock.mockResolvedValue([]);

    const { getCobuildAiContext } = await import("./context");

    const result = await getCobuildAiContext();

    expect(result.data.baseAsset.priceUsd).toBe(1.25);
    expect(result.data.treasury.balance.base).toBeNull();
    expect(result.data.mints.count.last7d).toBe(0);
    const median7d = result.data.mints.medianPrice.last7d;
    expect(median7d?.basePerToken).toBeNull();
    expect(result.data.holders.total).toBeNull();
    expect(result.data.distribution.top10Share).toBeNull();
    expect(getEthPriceUsdcMock).not.toHaveBeenCalled();
  });

  it("falls back to null cashOutTaxRate when stage data is missing", async () => {
    vi.useFakeTimers();
    const now = new Date("2025-02-01T00:00:00Z");
    vi.setSystemTime(now);

    getProjectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingToken: NATIVE_TOKEN,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 18,
      erc20Symbol: "COBUILD",
      erc20: null,
    });

    getTreasuryHistoryMock.mockResolvedValue({ symbol: "ETH", data: [] });
    getIssuanceTermsMock.mockResolvedValue({
      baseSymbol: "ETH",
      tokenSymbol: "COBUILD",
      stages: [],
      chartData: [],
      chartStart: 0,
      chartEnd: 0,
      now: now.getTime(),
      activeStageIndex: 0,
      summary: {
        currentIssuance: 2,
        nextIssuance: 2,
        nextChangeAt: null,
        nextChangeType: null,
        reservedPercent: null,
        activeStage: 1,
        nextStage: null,
      },
    });
    getSupplyBalanceHistoryMock.mockResolvedValue({
      baseSymbol: "ETH",
      tokenSymbol: "COBUILD",
      data: [],
    });
    getHoldersHistoryMock.mockResolvedValue({ symbol: "ETH", data: [] });
    getParticipantsMock.mockResolvedValue({ items: [], hasMore: false, tokenSymbol: "COBUILD" });

    getEthPriceUsdcMock.mockResolvedValue(2000);
    payEventFindManyMock.mockResolvedValue([]);

    const { getCobuildAiContext } = await import("./context");
    const result = await getCobuildAiContext();

    expect(result.data.issuance.cashOutTaxRate).toBeNull();
  });
});
