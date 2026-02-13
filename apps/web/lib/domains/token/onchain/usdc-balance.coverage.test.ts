import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

describe("getUsdcBalance", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns nulls when address is missing", async () => {
    const { getUsdcBalance } = await import("@/lib/domains/token/onchain/usdc-balance");

    await expect(getUsdcBalance(null)).resolves.toEqual({
      balance: null,
      balanceUsd: null,
    });
  }, 15000);

  it("formats and returns a balance", async () => {
    const readContract = vi.fn().mockResolvedValue(1234567n);
    vi.doMock("@/lib/domains/token/onchain/clients", () => ({
      getClient: () => ({ readContract }),
    }));

    const { getUsdcBalance } = await import("@/lib/domains/token/onchain/usdc-balance");

    const address = `0x${"1".repeat(40)}` as `0x${string}`;
    const result = await getUsdcBalance(address);

    expect(result.balance).toBe("1234567");
    expect(result.balanceUsd).toBe("1.23");
  });

  it("returns nulls on read errors", async () => {
    const readContract = vi.fn().mockRejectedValue(new Error("boom"));
    vi.doMock("@/lib/domains/token/onchain/clients", () => ({
      getClient: () => ({ readContract }),
    }));

    const { getUsdcBalance } = await import("@/lib/domains/token/onchain/usdc-balance");

    const address = `0x${"2".repeat(40)}` as `0x${string}`;
    const result = await getUsdcBalance(address);

    expect(result).toEqual({ balance: null, balanceUsd: null });
  });
});
