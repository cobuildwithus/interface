import { describe, expect, it, vi, beforeEach } from "vitest";
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

  it("returns empty data when no suckerGroupId", async () => {
    getProjectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 18,
    });

    const result = await getTreasuryHistory();
    expect(result.data).toEqual([]);
  });

  it("builds bucketed treasury history", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T18:00:00Z"));

    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
    });

    payEventsMock.mockResolvedValue([
      { timestamp: 0, amount: 10000 },
      { timestamp: 3600, amount: 5000 },
      { timestamp: 43200, amount: 20000 },
    ]);

    const result = await getTreasuryHistory();

    expect(result.data.length).toBeGreaterThan(2);
    expect(result.data[0]?.balance).toBe(150);
    expect(result.data[result.data.length - 1]?.balance).toBe(350);

    vi.useRealTimers();
  });
});
