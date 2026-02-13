import { describe, expect, it } from "vitest";
import { aggregateBackersFromSwaps, type CastIntentSwap } from "./intent-swaps.shared";

describe("aggregateBackersFromSwaps", () => {
  it("returns empty array for empty swaps", () => {
    expect(aggregateBackersFromSwaps([])).toEqual([]);
  });

  it("returns empty array for null-ish swaps", () => {
    // @ts-expect-error exercising nullish input handling
    expect(aggregateBackersFromSwaps(undefined)).toEqual([]);
  });

  it("aggregates totals per lowercased address and sorts by spend", () => {
    const swaps = [
      {
        id: "1",
        backerAddress: "0xABC",
        reaction: "like",
        spendUsdc: 10,
        tokensBought: 1,
        tokenSymbol: "T",
      },
      {
        id: "2",
        backerAddress: "0xabc",
        reaction: "like",
        spendUsdc: 5,
        tokensBought: 1,
        tokenSymbol: "T",
      },
      {
        id: "3",
        backerAddress: "0xdef",
        reaction: "like",
        spendUsdc: 20,
        tokensBought: 2,
        tokenSymbol: "T",
      },
    ];

    expect(aggregateBackersFromSwaps(swaps)).toEqual([
      { address: "0xdef", totalSpend: 20 },
      { address: "0xabc", totalSpend: 15 },
    ]);
  });

  it("handles missing spendUsdc as zero", () => {
    const swap: CastIntentSwap = {
      id: "1",
      backerAddress: "0xabc",
      reaction: null,
      // @ts-expect-error testing undefined spendUsdc fallback
      spendUsdc: undefined,
      tokensBought: 0,
      tokenSymbol: "T",
    };
    const swaps = [swap];

    expect(aggregateBackersFromSwaps(swaps)).toEqual([{ address: "0xabc", totalSpend: 0 }]);
  });
});
