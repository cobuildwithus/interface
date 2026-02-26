import { describe, expect, it, vi, beforeEach } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";
import { base } from "viem/chains";

vi.mock("server-only", () => ({}));

const getProjectMock = vi.fn();
const snapshotMock = vi.fn();

vi.mock("@/lib/domains/token/juicebox/project", () => ({
  getProject: () => getProjectMock(),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    juiceboxCashoutCoefficientSnapshot: {
      findMany: (...args: Parameters<typeof snapshotMock>) => snapshotMock(...args),
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

import { getSupplyBalanceHistory } from "@/lib/domains/token/juicebox/issuance-supply-balance-history";

describe("issuance-supply-balance-history", () => {
  beforeEach(() => {
    getProjectMock.mockReset();
    snapshotMock.mockReset();
  });

  it("returns empty data when no snapshots", async () => {
    getProjectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
      erc20Symbol: "COB",
    });
    snapshotMock.mockResolvedValue([]);

    const result = await getSupplyBalanceHistory();
    expect(result.data).toEqual([]);
  });

  it("aggregates snapshots across chains", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T18:00:00Z"));

    getProjectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
      erc20Symbol: "COB",
    });

    snapshotMock.mockResolvedValue([
      { chainId: base.id, timestamp: 0, balance: 10000, totalSupply: 1000 },
      { chainId: base.id, timestamp: 21600, balance: "bad", totalSupply: 1500 },
      { chainId: 10, timestamp: 21600, balance: 5000, totalSupply: 500 },
    ]);

    const result = await getSupplyBalanceHistory();

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]?.totalBalance).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it("includes snapshots that land after the final bucket start", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T19:00:00Z"));

    getProjectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
      erc20Symbol: "COB",
    });

    snapshotMock.mockResolvedValue([
      { chainId: base.id, timestamp: 0, balance: 100, totalSupply: "1000000000000000000" },
      { chainId: base.id, timestamp: 21660, balance: 2500, totalSupply: "2000000000000000000" },
    ]);

    const result = await getSupplyBalanceHistory();
    const lastPoint = result.data[result.data.length - 1]!;

    expect(lastPoint.totalBalance).toBe(25);
    expect(lastPoint.totalSupply).toBe(2);

    vi.useRealTimers();
  });

  it("uses suckerGroupId snapshot filter", async () => {
    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
      erc20Symbol: "COB",
    });
    snapshotMock.mockResolvedValue([
      { chainId: base.id, timestamp: 0, balance: 0, totalSupply: 0 },
    ]);

    const result = await getSupplyBalanceHistory();
    expect(result.data.length).toBeGreaterThan(0);
  });
});
