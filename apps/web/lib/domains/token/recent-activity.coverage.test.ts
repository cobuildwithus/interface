import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  swapExecuted: { findMany: vi.fn() },
  intent: { findMany: vi.fn() },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/db/cobuild-db-client", () => ({ default: prismaMock }));
vi.mock("@/lib/domains/token/onchain/addresses", () => ({
  contracts: { USDCBase: "0x" + "a".repeat(40) },
}));

import { getRecentActivityByWallet } from "@/lib/domains/token/recent-activity";

const ADDRESS = "0x" + "1".repeat(40);

describe("recent activity", () => {
  beforeEach(() => {
    prismaMock.swapExecuted.findMany.mockReset();
    prismaMock.intent.findMany.mockReset();
  });

  it("returns empty for missing address", async () => {
    await expect(getRecentActivityByWallet("")).resolves.toEqual([]);
  });

  it("queries executed swaps by recipient or intent sender", async () => {
    prismaMock.swapExecuted.findMany.mockResolvedValue([]);
    prismaMock.intent.findMany.mockResolvedValue([]);

    await getRecentActivityByWallet(ADDRESS, 25);

    const addressLower = ADDRESS.toLowerCase();
    expect(prismaMock.swapExecuted.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([
            { recipient: addressLower },
            {
              intents: {
                some: { walletAddressFrom: addressLower, status: "SENT" },
              },
            },
          ]),
        },
      })
    );
  });

  it("merges pending and executed activity, prioritizing pending", async () => {
    prismaMock.swapExecuted.findMany.mockResolvedValue([
      {
        id: "swap-1",
        recipient: ADDRESS,
        tokenOut: "0x" + "b".repeat(40),
        amountOut: "1000000",
        blockTimestamp: 100,
        intents: [
          {
            id: 1,
            walletAddressTo: "0x" + "c".repeat(40),
            spendAmountNum: "5000000",
            spendTokenAddress: "0x" + "a".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: null },
            reaction: "like",
            reactionId: null,
          },
        ],
        tokenOutErc20Token: { name: "Token A", symbol: "TKA", decimals: 6 },
      },
    ]);

    prismaMock.intent.findMany.mockResolvedValue([
      {
        id: 2,
        walletAddressTo: "0x" + "d".repeat(40),
        targetTokenAddress: "0x" + "e".repeat(40),
        targetAmount: "2000000",
        createdAt: new Date("2024-01-02T00:00:00Z"),
        spendAmountNum: "1000000",
        spendTokenAddress: "0x" + "a".repeat(40),
        targetTokenMetadata: { name: "Token B", symbol: "TKB", decimals: 6 },
        spendTokenMetadata: { decimals: 6, priceUsdc: "1" },
        reaction: null,
        reactionId: "direct_swap:123",
      },
    ]);

    const items = await getRecentActivityByWallet(ADDRESS, 25);
    expect(items.map((item) => item.id)).toEqual(["2", "1"]);
    expect(items[0]?.pending).toBe(true);
    expect(items[1]?.pending).toBe(false);
    expect(items[1]?.reaction).toBe("like");
    expect(items[0]?.reaction).toBe("direct_swap");
    expect(items[1]?.spendUsdc).toBe(5);
  });

  it("computes spend and token amounts", async () => {
    prismaMock.swapExecuted.findMany.mockResolvedValue([
      {
        id: "swap-2",
        recipient: ADDRESS,
        tokenOut: "0x" + "f".repeat(40),
        amountOut: "1000000",
        blockTimestamp: 200,
        intents: [
          {
            id: 3,
            walletAddressTo: "0x" + "c".repeat(40),
            spendAmountNum: "5000000",
            spendTokenAddress: "0x" + "a".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: "2" },
            reaction: null,
            reactionId: null,
          },
        ],
        tokenOutErc20Token: { name: "Token C", symbol: "TKC", decimals: 6 },
      },
    ]);

    prismaMock.intent.findMany.mockResolvedValue([]);

    const items = await getRecentActivityByWallet(ADDRESS, 25);
    expect(items).toHaveLength(1);
    expect(items[0]?.tokensBought).toBe(1);
    expect(items[0]?.spendUsdc).toBe(10);
  });

  it("splits swap amount across intents using spend weights", async () => {
    prismaMock.swapExecuted.findMany.mockResolvedValue([
      {
        id: "swap-6",
        recipient: ADDRESS,
        tokenOut: "0x" + "f".repeat(40),
        amountOut: "3000000",
        blockTimestamp: 250,
        intents: [
          {
            id: 9,
            walletAddressTo: "0x" + "c".repeat(40),
            spendAmountNum: "1000000",
            spendTokenAddress: "0x" + "a".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: "1" },
            reaction: null,
            reactionId: null,
          },
          {
            id: 10,
            walletAddressTo: "0x" + "c".repeat(40),
            spendAmountNum: "2000000",
            spendTokenAddress: "0x" + "a".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: "1" },
            reaction: null,
            reactionId: null,
          },
        ],
        tokenOutErc20Token: { name: "Token G", symbol: "TKG", decimals: 6 },
      },
    ]);

    prismaMock.intent.findMany.mockResolvedValue([]);

    const items = await getRecentActivityByWallet(ADDRESS, 25);
    const tokensById = Object.fromEntries(items.map((item) => [item.id, item.tokensBought]));
    expect(tokensById).toEqual({ "9": 1, "10": 2 });
  });

  it("uses intent target amounts when all intents provide them", async () => {
    prismaMock.swapExecuted.findMany.mockResolvedValue([
      {
        id: "swap-7",
        recipient: ADDRESS,
        tokenOut: "0x" + "f".repeat(40),
        amountOut: "1000000",
        blockTimestamp: 260,
        intents: [
          {
            id: 11,
            walletAddressTo: "0x" + "c".repeat(40),
            targetAmount: "1000000",
            spendAmountNum: "1000000",
            spendTokenAddress: "0x" + "a".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: "1" },
          },
          {
            id: 12,
            walletAddressTo: "0x" + "c".repeat(40),
            targetAmount: "2000000",
            spendAmountNum: "2000000",
            spendTokenAddress: "0x" + "a".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: "1" },
          },
        ],
        tokenOutErc20Token: { name: "Token H", symbol: "TKH", decimals: 6 },
      },
    ]);

    prismaMock.intent.findMany.mockResolvedValue([]);

    const items = await getRecentActivityByWallet(ADDRESS, 25);
    const tokensById = Object.fromEntries(items.map((item) => [item.id, item.tokensBought]));
    expect(tokensById).toEqual({ "11": 1, "12": 2 });
  });

  it("falls back to spend raw amounts when spend USD is missing", async () => {
    prismaMock.swapExecuted.findMany.mockResolvedValue([
      {
        id: "swap-8",
        recipient: ADDRESS,
        tokenOut: "0x" + "f".repeat(40),
        amountOut: "3000000",
        blockTimestamp: 270,
        intents: [
          {
            id: 13,
            walletAddressTo: "0x" + "c".repeat(40),
            spendAmountNum: "1000000",
            spendTokenAddress: "0x" + "b".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: null },
          },
          {
            id: 14,
            walletAddressTo: "0x" + "c".repeat(40),
            spendAmountNum: "2000000",
            spendTokenAddress: "0x" + "b".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: null },
          },
        ],
        tokenOutErc20Token: { name: "Token I", symbol: "TKI", decimals: 6 },
      },
    ]);

    prismaMock.intent.findMany.mockResolvedValue([]);

    const items = await getRecentActivityByWallet(ADDRESS, 25);
    const tokensById = Object.fromEntries(items.map((item) => [item.id, item.tokensBought]));
    expect(tokensById).toEqual({ "13": 1, "14": 2 });
  });

  it("splits equally when spend tokens differ and USD values are missing", async () => {
    prismaMock.swapExecuted.findMany.mockResolvedValue([
      {
        id: "swap-9",
        recipient: ADDRESS,
        tokenOut: "0x" + "f".repeat(40),
        amountOut: "2000000",
        blockTimestamp: 280,
        intents: [
          {
            id: 15,
            walletAddressTo: "0x" + "c".repeat(40),
            spendAmountNum: "1000000",
            spendTokenAddress: "0x" + "b".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: null },
          },
          {
            id: 16,
            walletAddressTo: "0x" + "c".repeat(40),
            spendAmountNum: "2000000",
            spendTokenAddress: "0x" + "c".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: null },
          },
        ],
        tokenOutErc20Token: { name: "Token J", symbol: "TKJ", decimals: 6 },
      },
    ]);

    prismaMock.intent.findMany.mockResolvedValue([]);

    const items = await getRecentActivityByWallet(ADDRESS, 25);
    const tokensById = Object.fromEntries(items.map((item) => [item.id, item.tokensBought]));
    expect(tokensById).toEqual({ "15": 1, "16": 1 });
  });

  it("falls back to zero when spend price is missing and token is non-USDC", async () => {
    prismaMock.swapExecuted.findMany.mockResolvedValue([
      {
        id: "swap-3",
        recipient: ADDRESS,
        tokenOut: "0x" + "f".repeat(40),
        amountOut: "0",
        blockTimestamp: 300,
        intents: [
          {
            id: 4,
            walletAddressTo: null,
            spendAmountNum: "5000000",
            spendTokenAddress: "0x" + "b".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: null },
          },
        ],
        tokenOutErc20Token: { name: null, symbol: null, decimals: 18 },
      },
    ]);

    prismaMock.intent.findMany.mockResolvedValue([]);

    const items = await getRecentActivityByWallet(ADDRESS, 25);
    expect(items[0]?.spendUsdc).toBe(0);
  });

  it("handles pending intents with missing target amount", async () => {
    prismaMock.swapExecuted.findMany.mockResolvedValue([]);
    prismaMock.intent.findMany.mockResolvedValue([
      {
        id: 5,
        walletAddressTo: null,
        targetTokenAddress: "0x" + "e".repeat(40),
        targetAmount: null,
        createdAt: new Date("2024-01-03T00:00:00Z"),
        spendAmountNum: null,
        spendTokenAddress: "0x" + "a".repeat(40),
        targetTokenMetadata: null,
        spendTokenMetadata: null,
      },
    ]);

    const items = await getRecentActivityByWallet(ADDRESS, 25);
    expect(items[0]?.tokensBought).toBe(0);
    expect(items[0]?.pending).toBe(true);
  });

  it("maps reactions and direct swap ids", async () => {
    prismaMock.swapExecuted.findMany.mockResolvedValue([
      {
        id: "swap-4",
        recipient: ADDRESS,
        tokenOut: "0x" + "f".repeat(40),
        amountOut: "1000000",
        blockTimestamp: 400,
        intents: [
          {
            id: 6,
            walletAddressTo: "0x" + "c".repeat(40),
            reaction: "like",
            reactionId: null,
            spendAmountNum: "1000000",
            spendTokenAddress: "0x" + "a".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: "1" },
          },
          {
            id: 7,
            walletAddressTo: "0x" + "c".repeat(40),
            reaction: null,
            reactionId: "direct_swap:abc",
            spendAmountNum: "1000000",
            spendTokenAddress: "0x" + "a".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: "1" },
          },
        ],
        tokenOutErc20Token: { name: "Token D", symbol: "TKD", decimals: 6 },
      },
    ]);
    prismaMock.intent.findMany.mockResolvedValue([]);

    const items = await getRecentActivityByWallet(ADDRESS, 25);
    expect(items.map((item) => item.reaction)).toEqual(["like", "direct_swap"]);
  });

  it("maps remaining reactions", async () => {
    prismaMock.swapExecuted.findMany.mockResolvedValue([
      {
        id: "swap-10",
        recipient: ADDRESS,
        tokenOut: "0x" + "f".repeat(40),
        amountOut: "4000000",
        blockTimestamp: 420,
        intents: [
          {
            id: 17,
            walletAddressTo: "0x" + "c".repeat(40),
            reaction: "recast",
            reactionId: null,
            spendAmountNum: "1000000",
            spendTokenAddress: "0x" + "a".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: "1" },
          },
          {
            id: 18,
            walletAddressTo: "0x" + "c".repeat(40),
            reaction: "comment",
            reactionId: null,
            spendAmountNum: "1000000",
            spendTokenAddress: "0x" + "a".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: "1" },
          },
          {
            id: 19,
            walletAddressTo: "0x" + "c".repeat(40),
            reaction: "quote_cast",
            reactionId: null,
            spendAmountNum: "1000000",
            spendTokenAddress: "0x" + "a".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: "1" },
          },
          {
            id: 20,
            walletAddressTo: "0x" + "c".repeat(40),
            reaction: "follow",
            reactionId: null,
            spendAmountNum: "1000000",
            spendTokenAddress: "0x" + "a".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: "1" },
          },
        ],
        tokenOutErc20Token: { name: "Token K", symbol: "TKK", decimals: 6 },
      },
    ]);
    prismaMock.intent.findMany.mockResolvedValue([]);

    const items = await getRecentActivityByWallet(ADDRESS, 25);
    expect(items.map((item) => item.reaction)).toEqual([
      "recast",
      "comment",
      "quote_cast",
      "follow",
    ]);
  });

  it("skips swaps without intents", async () => {
    prismaMock.swapExecuted.findMany.mockResolvedValue([
      {
        id: "swap-11",
        recipient: ADDRESS,
        tokenOut: "0x" + "f".repeat(40),
        amountOut: "1000000",
        blockTimestamp: 430,
        intents: [],
        tokenOutErc20Token: { name: "Token L", symbol: "TKL", decimals: 6 },
      },
    ]);
    prismaMock.intent.findMany.mockResolvedValue([]);

    const items = await getRecentActivityByWallet(ADDRESS, 25);
    expect(items).toHaveLength(0);
  });

  it("dedupes items and clamps limit", async () => {
    prismaMock.swapExecuted.findMany.mockResolvedValue([
      {
        id: "swap-5",
        recipient: ADDRESS,
        tokenOut: "0x" + "f".repeat(40),
        amountOut: "1000000",
        blockTimestamp: 500,
        intents: [
          {
            id: 8,
            walletAddressTo: "0x" + "c".repeat(40),
            spendAmountNum: "1000000",
            spendTokenAddress: "0x" + "a".repeat(40),
            spendTokenMetadata: { decimals: 6, priceUsdc: "1" },
          },
        ],
        tokenOutErc20Token: { name: "Token E", symbol: "TKE", decimals: 6 },
      },
    ]);
    prismaMock.intent.findMany.mockResolvedValue([
      {
        id: 8,
        walletAddressTo: "0x" + "d".repeat(40),
        targetTokenAddress: "0x" + "e".repeat(40),
        targetAmount: "2000000",
        createdAt: new Date("2024-01-04T00:00:00Z"),
        spendAmountNum: "1000000",
        spendTokenAddress: "0x" + "a".repeat(40),
        targetTokenMetadata: { name: "Token F", symbol: "TKF", decimals: 6 },
        spendTokenMetadata: { decimals: 6, priceUsdc: "1" },
      },
    ]);

    const items = await getRecentActivityByWallet(ADDRESS, 0);
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("8");
  });
});
