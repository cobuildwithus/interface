import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const treasuryHistoryMock = vi.fn();

vi.mock("@/lib/domains/token/juicebox/treasury-history", () => ({
  getTreasuryHistory: (...args: Parameters<typeof treasuryHistoryMock>) =>
    treasuryHistoryMock(...args),
}));

import { getFundingData } from "@/lib/domains/token/juicebox/funding-data";

describe("funding-data", () => {
  it("returns latest treasury balance", async () => {
    treasuryHistoryMock.mockResolvedValueOnce({
      data: [
        { timestamp: 1, balance: 5 },
        { timestamp: 2, balance: 12 },
      ],
      symbol: "USDC",
    });

    await expect(getFundingData()).resolves.toEqual({ treasury: 12 });
  });

  it("returns null when no history data", async () => {
    treasuryHistoryMock.mockResolvedValueOnce({ data: [], symbol: "USDC" });

    await expect(getFundingData()).resolves.toEqual({ treasury: null });
  });
});
