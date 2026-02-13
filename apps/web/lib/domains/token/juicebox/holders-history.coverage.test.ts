import { describe, expect, it, vi, beforeEach } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";

vi.mock("server-only", () => ({}));

const getProjectMock = vi.fn();
const participantsMock = vi.fn();
const payEventsMock = vi.fn();

vi.mock("@/lib/domains/token/juicebox/project", () => ({
  getProject: () => getProjectMock(),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    juiceboxParticipant: {
      findMany: (...args: Parameters<typeof participantsMock>) => participantsMock(...args),
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

import { getHoldersHistory } from "@/lib/domains/token/juicebox/holders-history";

describe("holders-history", () => {
  beforeEach(() => {
    getProjectMock.mockReset();
    participantsMock.mockReset();
    payEventsMock.mockReset();
  });

  it("returns empty history when no suckerGroupId", async () => {
    getProjectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
    });

    const result = await getHoldersHistory();
    expect(result.data).toEqual([]);
  });

  it("returns empty history when no participants", async () => {
    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
    });
    participantsMock.mockResolvedValue([]);

    const result = await getHoldersHistory();
    expect(result.data).toEqual([]);
  });

  it("builds holders history from participants and payments", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:02:00Z"));

    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
    });

    participantsMock.mockResolvedValue([
      {
        address: "0x" + "a".repeat(40),
        firstOwned: 10,
        createdAt: 10,
      },
      {
        address: "0x" + "b".repeat(40),
        firstOwned: null,
        createdAt: 20,
      },
    ]);

    payEventsMock.mockResolvedValue([
      { timestamp: 15, amount: 10000, payer: "0x" + "a".repeat(40) },
      { timestamp: 30, amount: 20000, payer: "0x" + "b".repeat(40) },
    ]);

    const result = await getHoldersHistory();

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]?.holders).toBe(2);
    expect(result.data[0]?.medianContribution).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it("handles participants with no payments", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:01:00Z"));

    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
    });

    participantsMock.mockResolvedValue([
      {
        address: "0x" + "c".repeat(40),
        firstOwned: null,
        createdAt: 10,
      },
    ]);
    payEventsMock.mockResolvedValue([]);

    const result = await getHoldersHistory();
    expect(result.data[0]?.holders).toBe(1);
    expect(result.data[0]?.medianContribution).toBe(0);

    vi.useRealTimers();
  });

  it("excludes zero-contribution holders from the median", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:05:00Z"));

    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
    });

    participantsMock.mockResolvedValue([
      {
        address: "0x" + "d".repeat(40),
        firstOwned: 10,
        createdAt: 10,
      },
      {
        address: "0x" + "e".repeat(40),
        firstOwned: 10,
        createdAt: 10,
      },
    ]);

    payEventsMock.mockResolvedValue([
      { timestamp: 20, amount: 10000, payer: "0x" + "d".repeat(40) },
    ]);

    const result = await getHoldersHistory();
    const lastPoint = result.data[result.data.length - 1];

    expect(lastPoint?.holders).toBe(2);
    expect(lastPoint?.medianContribution).toBe(100);

    vi.useRealTimers();
  });
});
