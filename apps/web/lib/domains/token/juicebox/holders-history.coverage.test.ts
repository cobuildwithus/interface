import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty history when no suckerGroupId", async () => {
    getProjectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
    });

    const result = await getHoldersHistory();
    expect(result.data).toEqual([]);
    expect(result.symbol).toBe("ETH");
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
    expect(result.symbol).toBe("ETH");
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
  });

  it("ignores non-holder payments, uses expected query filters, and keeps buckets stable", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:02:30Z"));

    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
    });

    const holderA = "0x" + "1".repeat(40);
    const holderB = "0x" + "2".repeat(40);
    const outsider = "0x" + "3".repeat(40);

    participantsMock.mockResolvedValue([
      {
        address: holderA,
        firstOwned: null,
        createdAt: 80,
      },
      {
        address: holderB,
        firstOwned: 70,
        createdAt: 90,
      },
    ]);

    payEventsMock.mockResolvedValue([
      { timestamp: 20, amount: 990000, payer: outsider },
      { timestamp: 80, amount: 10000, payer: holderA },
      { timestamp: 140, amount: 30000, payer: holderB },
    ]);

    const result = await getHoldersHistory();

    expect(participantsMock).toHaveBeenCalledWith({
      select: {
        address: true,
        firstOwned: true,
        createdAt: true,
      },
      where: {
        suckerGroupId: "group-1",
        balance: { gt: 0 },
      },
    });
    expect(payEventsMock).toHaveBeenCalledWith({
      select: {
        timestamp: true,
        amount: true,
        payer: true,
      },
      where: {
        suckerGroupId: "group-1",
        effectiveTokenCount: { gt: 0 },
      },
      orderBy: { timestamp: "asc" },
    });

    expect(result.symbol).toBe("ETH");
    expect(result.data.length).toBeGreaterThanOrEqual(2);
    expect(result.data[0]).toMatchObject({
      holders: 2,
      medianContribution: 100,
    });
    const lastPoint = result.data[result.data.length - 1];
    expect(lastPoint).toMatchObject({
      holders: 2,
      medianContribution: 200,
    });
    expect(lastPoint!.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it("appends a final point at the current timestamp when now is beyond the last bucket", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:10:00Z"));

    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
    });

    const holder = "0x" + "4".repeat(40);
    participantsMock.mockResolvedValue([
      {
        address: holder,
        firstOwned: null,
        createdAt: 10,
      },
    ]);
    payEventsMock.mockResolvedValue([{ timestamp: 20, amount: 10000, payer: holder }]);

    const result = await getHoldersHistory();
    const lastPoint = result.data[result.data.length - 1];

    expect(result.data.length).toBeGreaterThan(1);
    expect(lastPoint?.timestamp).toBe(Date.now());
    expect(lastPoint?.holders).toBe(1);
    expect(lastPoint?.medianContribution).toBe(100);
  });

  it("handles duplicate holder rows, repeated payer events, and bucket gaps", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:12:00Z"));

    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
    });

    const holder = "0x" + "5".repeat(40);
    participantsMock.mockResolvedValue([
      {
        address: holder,
        firstOwned: 0,
        createdAt: 0,
      },
      {
        address: holder,
        firstOwned: 120,
        createdAt: 120,
      },
    ]);
    payEventsMock.mockResolvedValue([
      { timestamp: 600, amount: 10000, payer: holder },
      { timestamp: 650, amount: 30000, payer: holder },
    ]);

    const result = await getHoldersHistory();
    const firstPoint = result.data[0];
    const lastPoint = result.data[result.data.length - 1];

    expect(result.data.length).toBeGreaterThan(3);
    expect(firstPoint?.holders).toBe(1);
    expect(firstPoint?.medianContribution).toBe(0);
    expect(lastPoint?.holders).toBe(1);
    expect(lastPoint?.medianContribution).toBe(400);
  });

  it("does not append a duplicate current point when now is inside the last bucket", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:10:00Z"));
    const nowSec = Math.floor(Date.now() / 1000);

    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      accountingTokenSymbol: "ETH",
      accountingDecimals: 2,
    });

    const holder = "0x" + "6".repeat(40);
    participantsMock.mockResolvedValue([
      {
        address: holder,
        firstOwned: nowSec,
        createdAt: nowSec,
      },
    ]);
    payEventsMock.mockResolvedValue([{ timestamp: nowSec, amount: 10000, payer: holder }]);

    const result = await getHoldersHistory();

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      timestamp: Date.now(),
      holders: 1,
      medianContribution: 100,
    });
  });
});
