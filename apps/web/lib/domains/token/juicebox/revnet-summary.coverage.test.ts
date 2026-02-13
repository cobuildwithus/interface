import { describe, expect, it, vi, beforeEach } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";

vi.mock("server-only", () => ({}));
const passthroughCache: typeof unstableCache = (fn, _keyParts, _options) => fn;
vi.mock("next/cache", () => ({
  unstable_cache: passthroughCache,
}));

const getUserMock = vi.fn();
const getProjectMock = vi.fn();
const participantMock = vi.fn();
const participantsMock = vi.fn();
const tokenMetadataMock = vi.fn();

vi.mock("@/lib/domains/auth/session", () => ({
  getUser: () => getUserMock(),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    tokenMetadata: {
      findUnique: (...args: Parameters<typeof tokenMetadataMock>) => tokenMetadataMock(...args),
    },
    juiceboxParticipant: {
      findUnique: (...args: Parameters<typeof participantMock>) => participantMock(...args),
      findMany: (...args: Parameters<typeof participantsMock>) => participantsMock(...args),
    },
  },
}));

vi.mock("@/lib/domains/token/juicebox/project", () => ({
  getProject: () => getProjectMock(),
}));

import { getRevnetSummary } from "@/lib/domains/token/juicebox/revnet-summary";
import { applyJbDaoCashoutFee, applyRevnetCashoutFee } from "@/lib/domains/token/juicebox/fees";

const WAD = 10n ** 18n;
const WAD2 = WAD * WAD;

function computeCashOutValue(balance: bigint, cashoutA: bigint, cashoutB: bigint) {
  if (balance === 0n) return 0n;
  if (cashoutA === 0n && cashoutB === 0n) return 0n;
  const netBalance = applyRevnetCashoutFee(balance);
  if (netBalance === 0n) return 0n;
  const reclaimable = (cashoutA * netBalance) / WAD + (cashoutB * netBalance * netBalance) / WAD2;
  return applyJbDaoCashoutFee(reclaimable);
}

describe("revnet-summary", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    getProjectMock.mockReset();
    participantMock.mockReset();
    participantsMock.mockReset();
    tokenMetadataMock.mockReset();
  });

  it("returns zero balances when not authenticated", async () => {
    getUserMock.mockResolvedValue(null);
    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      erc20Symbol: "COB",
      erc20: "0x" + "1".repeat(40),
      accountingTokenSymbol: "ETH",
      accountingDecimals: 18,
    });
    tokenMetadataMock.mockResolvedValue({ logoUrl: "logo.png" });

    const summary = await getRevnetSummary();

    expect(summary.address).toBeNull();
    expect(summary.balance).toBe("0");
    expect(summary.cashOutValue).toBe("0");
    expect(summary.tokenLogoUrl).toBe("logo.png");
  });

  it("returns balances for authenticated user", async () => {
    const address = "0x" + "a".repeat(40);
    getUserMock.mockResolvedValue(address);
    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      erc20Symbol: "COB",
      erc20: "0x" + "1".repeat(40),
      accountingTokenSymbol: "ETH",
      accountingDecimals: 18,
    });
    tokenMetadataMock.mockResolvedValue({ logoUrl: null });
    participantMock.mockResolvedValue({ balance: 12345n });
    participantsMock.mockResolvedValue([
      { balance: 67890n, project: { cashoutA: 10n ** 18n, cashoutB: 0n } },
    ]);

    const summary = await getRevnetSummary();
    const expectedCashOutValue = applyJbDaoCashoutFee(applyRevnetCashoutFee(67890n));

    expect(summary.address).toBe(address);
    expect(summary.balance).toBe("12345");
    expect(summary.cashOutValue).toBe(expectedCashOutValue.toString());
    expect(summary.baseTokenSymbol).toBe("ETH");
  });

  it("handles missing token metadata and aggregate", async () => {
    const address = "0x" + "b".repeat(40);
    getUserMock.mockResolvedValue(address);
    getProjectMock.mockResolvedValue({
      suckerGroupId: null,
      erc20Symbol: null,
      erc20: null,
      accountingTokenSymbol: "ETH",
      accountingDecimals: 18,
    });
    tokenMetadataMock.mockResolvedValue(null);
    participantMock.mockResolvedValue(null);

    const summary = await getRevnetSummary();

    expect(summary.tokenLogoUrl).toBeNull();
    expect(summary.cashOutValue).toBe("0");
    expect(participantsMock).not.toHaveBeenCalled();
  });

  it("defaults missing metadata when unauthenticated", async () => {
    getUserMock.mockResolvedValue(null);
    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-2",
      erc20Symbol: "COB",
      erc20: null,
      accountingTokenSymbol: "ETH",
      accountingDecimals: null,
    });

    const summary = await getRevnetSummary();

    expect(summary.accountingDecimals).toBe(18);
    expect(summary.tokenLogoUrl).toBeNull();
  });

  it("covers cash-out edge branches", async () => {
    const address = "0x" + "c".repeat(40);
    getUserMock.mockResolvedValue(address);
    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-3",
      erc20Symbol: "COB",
      erc20: "0x" + "2".repeat(40),
      accountingTokenSymbol: "ETH",
      accountingDecimals: undefined,
    });
    tokenMetadataMock.mockResolvedValue(null);
    participantMock.mockResolvedValue({ balance: 0n });
    participantsMock.mockResolvedValue([
      { balance: "", project: { cashoutA: "1", cashoutB: "1" } },
      { balance: "1", project: { cashoutA: "0", cashoutB: "0" } },
      { balance: "2.0", project: { cashoutA: "1000000000000000000", cashoutB: "1.5" } },
    ]);

    const summary = await getRevnetSummary();

    expect(summary.accountingDecimals).toBe(18);
    expect(summary.cashOutValue).toBe("0");
  });

  it("uses fallback cash-out when group participants are missing", async () => {
    const address = "0x" + "d".repeat(40);
    getUserMock.mockResolvedValue(address);
    getProjectMock.mockResolvedValue({
      suckerGroupId: null,
      erc20Symbol: "COB",
      erc20: "0x" + "3".repeat(40),
      accountingTokenSymbol: "ETH",
      accountingDecimals: 18,
    });
    tokenMetadataMock.mockResolvedValue({ logoUrl: null });
    participantMock.mockResolvedValue({
      balance: "2.0",
      project: { cashoutA: "1000000000000000000", cashoutB: "0" },
    });

    const summary = await getRevnetSummary();
    const expected = computeCashOutValue(2n, 10n ** 18n, 0n);

    expect(summary.cashOutValue).toBe(expected.toString());
  });

  it("coerces numeric input shapes for cash-out math", async () => {
    const address = "0x" + "e".repeat(40);
    getUserMock.mockResolvedValue(address);
    getProjectMock.mockResolvedValue({
      suckerGroupId: "group-4",
      erc20Symbol: "COB",
      erc20: "0x" + "4".repeat(40),
      accountingTokenSymbol: "ETH",
      accountingDecimals: 18,
    });
    tokenMetadataMock.mockResolvedValue({ logoUrl: null });
    participantMock.mockResolvedValue({ balance: 0n });
    participantsMock.mockResolvedValue([
      {
        balance: { toFixed: () => "1000" },
        project: { cashoutA: "1000000000000000000", cashoutB: "0" },
      },
      {
        balance: 12.9,
        project: { cashoutA: "1.23e3", cashoutB: "2.0" },
      },
      {
        balance: "1e-3",
        project: { cashoutA: "1", cashoutB: "1" },
      },
    ]);

    const summary = await getRevnetSummary();
    const expected =
      computeCashOutValue(1000n, 10n ** 18n, 0n) +
      computeCashOutValue(12n, 1230n, 2n) +
      computeCashOutValue(0n, 1n, 1n);

    expect(summary.cashOutValue).toBe(expected.toString());
  });

  it("swallows debug log failures", async () => {
    const originalLog = console.log;
    console.log = () => {
      throw new Error("boom");
    };

    try {
      getUserMock.mockResolvedValue(null);
      getProjectMock.mockResolvedValue({
        suckerGroupId: "group-5",
        erc20Symbol: "COB",
        erc20: "0x" + "5".repeat(40),
        accountingTokenSymbol: "ETH",
        accountingDecimals: 18,
      });
      tokenMetadataMock.mockResolvedValue(null);

      await expect(getRevnetSummary()).resolves.toBeDefined();
    } finally {
      console.log = originalLog;
    }
  });
});
