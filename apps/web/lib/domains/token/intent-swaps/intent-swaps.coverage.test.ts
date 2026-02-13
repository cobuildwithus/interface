import { describe, expect, it, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  tokenMetadata: { findUnique: vi.fn() },
  intent: { findMany: vi.fn() },
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({ default: prismaMock }));
vi.mock("@/lib/domains/token/onchain/addresses", () => ({
  contracts: { CobuildToken: "0x" + "a".repeat(40) },
  BASE_CHAIN_ID: 8453,
}));

import {
  getSwapsByEntityId,
  getSwapsByCastHash,
} from "@/lib/domains/token/intent-swaps/intent-swaps";

describe("intent swaps", () => {
  beforeEach(() => {
    prismaMock.tokenMetadata.findUnique.mockReset();
    prismaMock.intent.findMany.mockReset();
  });

  it("returns empty for blank entity", async () => {
    await expect(getSwapsByEntityId("")).resolves.toEqual([]);
  });

  it("maps intents into swaps", async () => {
    prismaMock.tokenMetadata.findUnique.mockResolvedValue({ decimals: 6, symbol: "TEST" });
    prismaMock.intent.findMany.mockResolvedValue([
      {
        id: 1,
        walletAddressFrom: null,
      },
      {
        id: 2,
        walletAddressFrom: "0x" + "b".repeat(40),
        reaction: "like",
        targetAmount: "1000000",
        spendAmountNum: "1000000",
        createdAt: new Date(),
        swapExecuted: null,
        spendTokenMetadata: { priceUsdc: "2", decimals: 6 },
      },
      {
        id: 3,
        walletAddressFrom: "0x" + "c".repeat(40),
        reaction: null,
        targetAmount: null,
        spendAmountNum: "1000000",
        createdAt: new Date(),
        swapExecuted: { amountOut: "2000000" },
        spendTokenMetadata: { priceUsdc: "1", decimals: 6 },
      },
    ]);

    const swaps = await getSwapsByEntityId("0x" + "1".repeat(40));
    expect(swaps).toHaveLength(2);
    expect(swaps[0]?.tokenSymbol).toBe("TEST");
    expect(swaps[0]?.tokensBought).toBe(1);
    expect(swaps[0]?.spendUsdc).toBe(2);
  });

  it("skips invalid intents and applies defaults", async () => {
    prismaMock.tokenMetadata.findUnique.mockResolvedValue({ decimals: 18, symbol: "$COBUILD" });
    prismaMock.intent.findMany.mockResolvedValue([
      {
        id: 1,
        walletAddressFrom: "0x" + "b".repeat(40),
        reaction: null,
        targetAmount: "0",
        spendAmountNum: null,
        createdAt: new Date(),
        swapExecuted: null,
        spendTokenMetadata: null,
      },
      {
        id: 2,
        walletAddressFrom: "0x" + "c".repeat(40),
        reaction: null,
        targetAmount: null,
        spendAmountNum: null,
        createdAt: new Date(),
        swapExecuted: null,
        spendTokenMetadata: null,
      },
      {
        id: 3,
        walletAddressFrom: "0x" + "d".repeat(40),
        reaction: null,
        targetAmount: "1000000000000000000",
        spendAmountNum: "1000000",
        createdAt: new Date(),
        swapExecuted: null,
        spendTokenMetadata: null,
      },
    ]);

    const swaps = await getSwapsByEntityId("0x" + "2".repeat(40));
    expect(swaps).toHaveLength(1);
    expect(swaps[0]?.spendUsdc).toBe(1);
  });

  it("aliases cast hash lookup", async () => {
    prismaMock.tokenMetadata.findUnique.mockResolvedValue({ decimals: 18, symbol: "$COBUILD" });
    prismaMock.intent.findMany.mockResolvedValue([]);
    await expect(getSwapsByCastHash("0x" + "1".repeat(40))).resolves.toEqual([]);
  });
});
