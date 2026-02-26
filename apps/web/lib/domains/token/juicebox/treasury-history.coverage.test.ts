import { beforeEach, describe, expect, it, vi } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";

vi.mock("server-only", () => ({}));

const getProjectMock = vi.fn();
const payEventsMock = vi.fn();

vi.mock("@/lib/domains/token/juicebox/project", () => ({
  getProject: () => getProjectMock(),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
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

import { getTreasuryHistory } from "@/lib/domains/token/juicebox/treasury-history";

describe("treasury-history", () => {
  beforeEach(() => {
    getProjectMock.mockReset();
    payEventsMock.mockReset();
  });

  it("returns empty data and symbol when project has no suckerGroupId", async () => {
    getProjectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 18,
    });

    const result = await getTreasuryHistory();
    expect(result).toEqual({ data: [], symbol: "ETH" });
    expect(payEventsMock).not.toHaveBeenCalled();
  });

  it("returns empty data when there are no qualifying payments", async () => {
    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      accountingTokenSymbol: "USDC",
      accountingDecimals: 6,
    });
    payEventsMock.mockResolvedValue([]);

    const result = await getTreasuryHistory();

    expect(result).toEqual({ data: [], symbol: "USDC" });
    expect(payEventsMock).toHaveBeenCalledTimes(1);
    expect(payEventsMock).toHaveBeenCalledWith({
      select: {
        timestamp: true,
        amount: true,
      },
      where: {
        suckerGroupId: "group-1",
        newlyIssuedTokenCount: { gt: 0 },
      },
      orderBy: { timestamp: "asc" },
    });
  });

  it("aggregates cumulative balances by 6-hour buckets and fills bucket gaps", async () => {
    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
    });
    payEventsMock.mockResolvedValue([
      { timestamp: 3600, amount: 10000 },
      { timestamp: 18000, amount: 5000 },
      { timestamp: 46800, amount: 2500 },
      { timestamp: 50000, amount: 500 },
      { timestamp: 90000, amount: 2000 },
    ]);

    const result = await getTreasuryHistory();

    expect(result).toEqual({
      symbol: "ETH",
      data: [
        { timestamp: 0, balance: 150 },
        { timestamp: 21600000, balance: 150 },
        { timestamp: 43200000, balance: 180 },
        { timestamp: 64800000, balance: 180 },
        { timestamp: 86400000, balance: 200 },
      ],
    });
  });
});
