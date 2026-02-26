import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectInfo } from "@/lib/domains/token/juicebox/project";

vi.mock("server-only", () => ({}));

const mockPayEventFindMany = vi.fn();

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    juiceboxPayEvent: {
      findMany: (...args: Parameters<typeof mockPayEventFindMany>) => mockPayEventFindMany(...args),
    },
  },
}));

const defaultProject: ProjectInfo = {
  suckerGroupId: "group-1",
  accountingToken: "0x0000000000000000000000000000000000000000",
  accountingTokenSymbol: "ETH",
  accountingDecimals: 0,
  erc20Symbol: "COB",
  erc20: null,
};

describe("getMintStats", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPayEventFindMany.mockResolvedValue([]);
  });

  it("returns zeroed windows when the project has no suckerGroupId", async () => {
    const { getMintStats } = await import("./mints");

    const result = await getMintStats(
      {
        ...defaultProject,
        suckerGroupId: null,
      },
      Date.parse("2025-01-31T00:00:00Z"),
      100
    );

    expect(result).toEqual({
      count: { last6h: 0, last24h: 0, last7d: 0, last30d: 0 },
      uniqueMinters: { last6h: 0, last24h: 0, last7d: 0, last30d: 0 },
      medianPrice: {
        last6h: { basePerToken: null, usdPerToken: null },
        last24h: { basePerToken: null, usdPerToken: null },
        last7d: { basePerToken: null, usdPerToken: null },
        last30d: { basePerToken: null, usdPerToken: null },
      },
      medianSize: {
        last6h: { tokens: null },
        last24h: { tokens: null },
        last7d: { tokens: null },
        last30d: { tokens: null },
      },
    });
    expect(mockPayEventFindMany).not.toHaveBeenCalled();
  });

  it("aggregates mint windows with payer normalization and USD conversion", async () => {
    mockPayEventFindMany.mockResolvedValue([
      {
        timestamp: Math.floor(Date.parse("2025-01-20T00:00:00Z") / 1000),
        payer: "0xccc",
        amount: 7n,
        effectiveTokenCount: 7_000_000_000_000_000_000n,
      },
      {
        timestamp: Math.floor(Date.parse("2025-01-29T00:00:00Z") / 1000),
        payer: "0xBbB",
        amount: 8n,
        effectiveTokenCount: 4_000_000_000_000_000_000n,
      },
      {
        timestamp: Math.floor(Date.parse("2025-01-30T12:00:00Z") / 1000),
        payer: "0xaaa",
        amount: 9n,
        effectiveTokenCount: 3_000_000_000_000_000_000n,
      },
      {
        timestamp: Math.floor(Date.parse("2025-01-30T23:00:00Z") / 1000),
        payer: "0xAAA",
        amount: 20n,
        effectiveTokenCount: 10_000_000_000_000_000_000n,
      },
    ]);

    const { getMintStats } = await import("./mints");
    const nowMs = Date.parse("2025-01-31T00:00:00Z");

    const result = await getMintStats(defaultProject, nowMs, 100);

    expect(mockPayEventFindMany).toHaveBeenCalledWith({
      select: {
        timestamp: true,
        payer: true,
        amount: true,
        effectiveTokenCount: true,
      },
      where: {
        suckerGroupId: "group-1",
        effectiveTokenCount: { gt: 0 },
      },
      orderBy: { timestamp: "asc" },
    });

    expect(result.count).toEqual({ last6h: 1, last24h: 2, last7d: 3, last30d: 4 });
    expect(result.uniqueMinters).toEqual({ last6h: 1, last24h: 1, last7d: 2, last30d: 3 });
    expect(result.medianPrice).toEqual({
      last6h: { basePerToken: 2, usdPerToken: 200 },
      last24h: { basePerToken: 2.5, usdPerToken: 250 },
      last7d: { basePerToken: 2, usdPerToken: 200 },
      last30d: { basePerToken: 2, usdPerToken: 200 },
    });
    expect(result.medianSize).toEqual({
      last6h: { tokens: 10 },
      last24h: { tokens: 6.5 },
      last7d: { tokens: 4 },
      last30d: { tokens: 5.5 },
    });
  });

  it("returns null USD medians when basePriceUsd is unavailable", async () => {
    mockPayEventFindMany.mockResolvedValue([
      {
        timestamp: Math.floor(Date.parse("2025-01-30T23:00:00Z") / 1000),
        payer: "0xabc",
        amount: 10n,
        effectiveTokenCount: 5_000_000_000_000_000_000n,
      },
    ]);

    const { getMintStats } = await import("./mints");

    const result = await getMintStats(defaultProject, Date.parse("2025-01-31T00:00:00Z"), null);

    expect(result.medianPrice.last6h).toEqual({ basePerToken: 2, usdPerToken: null });
  });

  it("treats zero-mint events as null price medians", async () => {
    mockPayEventFindMany.mockResolvedValue([
      {
        timestamp: Math.floor(Date.parse("2025-01-30T23:00:00Z") / 1000),
        payer: "0xabc",
        amount: 10n,
        effectiveTokenCount: 0n,
      },
    ]);

    const { getMintStats } = await import("./mints");
    const result = await getMintStats(defaultProject, Date.parse("2025-01-31T00:00:00Z"), 100);

    expect(result.count.last6h).toBe(1);
    expect(result.uniqueMinters.last6h).toBe(1);
    expect(result.medianSize.last6h).toEqual({ tokens: 0 });
    expect(result.medianPrice.last6h).toEqual({ basePerToken: null, usdPerToken: null });
  });
});
