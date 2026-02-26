import { describe, expect, it, vi, beforeEach } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";
import { base } from "viem/chains";

vi.mock("server-only", () => ({}));

const projectMock = vi.fn();
const rulesetMock = vi.fn();

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    juiceboxProject: {
      findUniqueOrThrow: (...args: Parameters<typeof projectMock>) => projectMock(...args),
    },
    juiceboxRuleset: {
      findMany: (...args: Parameters<typeof rulesetMock>) => rulesetMock(...args),
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

import { getIssuanceTerms } from "@/lib/domains/token/juicebox/issuance-terms";

describe("issuance-terms", () => {
  beforeEach(() => {
    projectMock.mockReset();
    rulesetMock.mockReset();
  });

  it("returns empty terms when no rulesets", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    projectMock.mockResolvedValue({
      suckerGroupId: "group-1",
      accountingTokenSymbol: "ETH",
      erc20Symbol: "COB",
    });
    rulesetMock.mockResolvedValue([]);

    const result = await getIssuanceTerms();

    expect(result.stages).toEqual([]);
    expect(result.chartData).toEqual([]);

    vi.useRealTimers();
  });

  it("builds stages and summary from rulesets", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("1970-01-01T00:00:30Z"));

    projectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      erc20Symbol: "COB",
    });

    rulesetMock.mockResolvedValue([
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 1n,
        start: 0n,
        duration: 10n,
        weight: 1_000_000_000_000_000_000n,
        weightCutPercent: 100_000_000,
        reservedPercent: 0,
        cashOutTaxRate: 5000,
      },
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 2n,
        start: 100n,
        duration: 0n,
        weight: 2_000_000_000_000_000_000n,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 5000,
      },
    ]);

    const result = await getIssuanceTerms();

    expect(result.stages.length).toBe(2);
    expect(result.summary.activeStage).toBe(1);
    expect(result.summary.nextChangeType).toBe("cut");
    expect(result.chartData.length).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it("returns upcoming stage summary when before start", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("1970-01-01T00:00:00Z"));

    projectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      erc20Symbol: "COB",
    });

    rulesetMock.mockResolvedValue([
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 1n,
        start: 100n,
        duration: 0n,
        weight: 1_000_000_000_000_000_000n,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
    ]);

    const result = await getIssuanceTerms();

    expect(result.summary.activeStage).toBeNull();
    expect(result.summary.nextChangeType).toBe("stage");

    vi.useRealTimers();
  });

  it("handles zero duration stages without cuts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("1970-01-01T00:02:00Z"));

    projectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      erc20Symbol: "COB",
    });

    rulesetMock.mockResolvedValue([
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 1n,
        start: 0n,
        duration: 0n,
        weight: 1_000_000_000_000_000_000n,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 2n,
        start: 300n,
        duration: 0n,
        weight: 2_000_000_000_000_000_000n,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
    ]);

    const result = await getIssuanceTerms();

    expect(result.summary.activeStage).toBe(1);
    expect(result.summary.nextChangeType).toBe("stage");

    vi.useRealTimers();
  });

  it("falls back to stage change when cut exceeds stage end", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("1970-01-01T00:00:10Z"));

    projectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      erc20Symbol: "COB",
    });

    rulesetMock.mockResolvedValue([
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 1n,
        start: 0n,
        duration: 100n,
        weight: 1_000_000_000_000_000_000n,
        weightCutPercent: 500_000_000,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
      {
        chainId: base.id,
        projectId: 6,
        rulesetId: 2n,
        start: 50n,
        duration: 0n,
        weight: 2_000_000_000_000_000_000n,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
    ]);

    const result = await getIssuanceTerms();
    expect(result.summary.nextChangeType).toBe("stage");

    vi.useRealTimers();
  });

  it("uses non-base rulesets when no primary rulesets exist", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("1970-01-01T00:00:10Z"));

    projectMock.mockResolvedValue({
      suckerGroupId: null,
      accountingTokenSymbol: "ETH",
      erc20Symbol: "COB",
    });

    rulesetMock.mockResolvedValue([
      {
        chainId: 10,
        projectId: 6,
        rulesetId: 1n,
        start: 0n,
        duration: 0n,
        weight: 1_000_000_000_000_000_000n,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
    ]);

    const result = await getIssuanceTerms();
    expect(result.stages.length).toBe(1);

    vi.useRealTimers();
  });
});
