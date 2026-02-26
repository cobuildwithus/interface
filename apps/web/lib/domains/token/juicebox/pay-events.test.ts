import { describe, it, expect, vi, beforeEach } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";
import { base } from "viem/chains";
import { COBUILD_JUICEBOX_PROJECT_ID } from "@/lib/domains/token/juicebox/constants";

vi.mock("server-only", () => ({}));

const mockFindUniqueOrThrow = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    juiceboxProject: {
      findUniqueOrThrow: (...args: Parameters<typeof mockFindUniqueOrThrow>) =>
        mockFindUniqueOrThrow(...args),
    },
    juiceboxPayEvent: {
      findMany: (...args: Parameters<typeof mockFindMany>) => mockFindMany(...args),
    },
  },
}));

const passthroughCache: typeof unstableCache = (fn, _keyParts, _options) => fn;
vi.mock("next/cache", () => ({
  unstable_cache: passthroughCache,
}));

describe("pay-events", () => {
  beforeEach(() => {
    mockFindUniqueOrThrow.mockReset();
    mockFindMany.mockReset();
  });

  it("fetches pay events with correct params", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ suckerGroupId: "group-1" });
    mockFindMany.mockResolvedValue([
      {
        txHash: "0xabcd",
        timestamp: 1704067200,
        payer: "0x1234567890123456789012345678901234567890",
        amount: 123,
        effectiveTokenCount: 456,
        buybackTokenCount: 0,
        beneficiary: "0xabc",
        chainId: base.id,
        memo: "hello",
        txnValue: "0",
        project: { erc20Symbol: "TEST", accountingTokenSymbol: "ETH", accountingDecimals: 18 },
      },
    ]);

    const { getPayEvents, PAY_EVENTS_PAGE_SIZE } = await import("./pay-events");
    const page = await getPayEvents();

    expect(mockFindUniqueOrThrow).toHaveBeenCalledWith({
      where: { chainId_projectId: { chainId: base.id, projectId: COBUILD_JUICEBOX_PROJECT_ID } },
      select: {
        suckerGroupId: true,
        accountingToken: true,
        accountingTokenSymbol: true,
        accountingDecimals: true,
        erc20Symbol: true,
        erc20: true,
      },
    });
    expect(mockFindMany).toHaveBeenCalledWith({
      select: {
        txHash: true,
        timestamp: true,
        payer: true,
        amount: true,
        effectiveTokenCount: true,
        buybackTokenCount: true,
        beneficiary: true,
        chainId: true,
        memo: true,
        txnValue: true,
        project: {
          select: { erc20Symbol: true, accountingTokenSymbol: true, accountingDecimals: true },
        },
      },
      where: { suckerGroupId: "group-1", effectiveTokenCount: { gt: 0 } },
      orderBy: { timestamp: "desc" },
      take: PAY_EVENTS_PAGE_SIZE + 1,
      skip: 0,
    });
    expect(page).toEqual({
      items: [
        {
          txHash: "0xabcd",
          timestamp: 1704067200,
          payer: "0x1234567890123456789012345678901234567890",
          amount: "123",
          effectiveTokenCount: "456",
          buybackTokenCount: "0",
          beneficiary: "0xabc",
          chainId: base.id,
          memo: "hello",
          txnValue: "0",
          project: { erc20Symbol: "TEST", accountingTokenSymbol: "ETH", accountingDecimals: 18 },
        },
      ],
      hasMore: false,
    });
  });

  it("returns empty page when no suckerGroupId", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ suckerGroupId: null });

    const { getPayEvents } = await import("./pay-events");
    const page = await getPayEvents();

    expect(page).toEqual({ items: [], hasMore: false });
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("handles Decimal-like objects", async () => {
    class FakeDecimal {
      private value: string;
      constructor(value: string) {
        this.value = value;
      }
      toString() {
        return this.value;
      }
    }

    mockFindUniqueOrThrow.mockResolvedValue({ suckerGroupId: "group-2" });
    mockFindMany.mockResolvedValue([
      {
        txHash: "0xdef0",
        timestamp: 1704067201,
        payer: "0x0000000000000000000000000000000000000000",
        amount: new FakeDecimal("1000000000000000000"),
        effectiveTokenCount: new FakeDecimal("2000000000000000000"),
        buybackTokenCount: new FakeDecimal("3000000000000000000"),
        beneficiary: "0xabc",
        chainId: base.id,
        memo: "memo",
        txnValue: "0",
        project: { erc20Symbol: null, accountingTokenSymbol: "ETH", accountingDecimals: 18 },
      },
    ]);

    const { getPayEvents } = await import("./pay-events");
    const page = await getPayEvents();

    expect(page.items[0]?.amount).toBe("1000000000000000000");
    expect(page.items[0]?.effectiveTokenCount).toBe("2000000000000000000");
    expect(page.items[0]?.buybackTokenCount).toBe("3000000000000000000");
  });

  it("detects hasMore when results exceed limit", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ suckerGroupId: "group-3" });

    const { getPayEvents, PAY_EVENTS_PAGE_SIZE } = await import("./pay-events");

    const manyResults = Array.from({ length: PAY_EVENTS_PAGE_SIZE + 1 }, (_, i) => ({
      txHash: `0x${String(i).padStart(64, "0")}`,
      timestamp: 1704067200 + i,
      payer: "0x0000000000000000000000000000000000000000",
      amount: 100,
      effectiveTokenCount: 200,
      buybackTokenCount: 0,
      beneficiary: "0xabc",
      chainId: base.id,
      memo: "",
      txnValue: "0",
      project: { erc20Symbol: "TEST", accountingTokenSymbol: "ETH", accountingDecimals: 18 },
    }));
    mockFindMany.mockResolvedValue(manyResults);

    const page = await getPayEvents();

    expect(page.hasMore).toBe(true);
    expect(page.items.length).toBe(PAY_EVENTS_PAGE_SIZE);
  });

  it("passes offset for pagination", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ suckerGroupId: "group-4" });
    mockFindMany.mockResolvedValue([]);

    const { getPayEvents, PAY_EVENTS_PAGE_SIZE } = await import("./pay-events");
    await getPayEvents(PAY_EVENTS_PAGE_SIZE, 10);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: PAY_EVENTS_PAGE_SIZE + 1,
      })
    );
  });
});
