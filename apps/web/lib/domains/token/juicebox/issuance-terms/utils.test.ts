import { describe, expect, it } from "vitest";
import {
  addPoint,
  buildChartData,
  buildSummary,
  clamp,
  findActiveStageIndex,
  parseRuleset,
  toNumber,
  weightAtTimestamp,
} from "./utils";
import { WEIGHT_CUT_SCALE, WEIGHT_SCALE } from "./constants";
import type { IssuanceStage, RawRuleset } from "./types";

describe("issuance terms utils", () => {
  it("clamps and parses numbers", () => {
    expect(toNumber("bad")).toBe(0);
    expect(clamp(Number.NaN, 1, 2)).toBe(1);
    expect(clamp(3, 0, 1)).toBe(1);

    const raw: RawRuleset = {
      chainId: 8453,
      projectId: 1,
      rulesetId: 1n,
      start: 0n,
      duration: 10n,
      weight: String(WEIGHT_SCALE),
      weightCutPercent: WEIGHT_CUT_SCALE / 2,
      reservedPercent: 0,
      cashOutTaxRate: 0,
    };
    const parsed = parseRuleset(raw);
    expect(parsed.weight).toBe(1);
    expect(parsed.weightCutPercent).toBe(0.5);
  });

  it("finds active stages and computes weight", () => {
    const stages: IssuanceStage[] = [
      {
        stage: 1,
        start: 0,
        end: 2000,
        duration: 10,
        weight: 2,
        weightCutPercent: 0.5,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
      {
        stage: 2,
        start: 3000,
        end: null,
        duration: 0,
        weight: 1,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
    ];

    expect(findActiveStageIndex(stages, 1)).toBe(0);
    expect(findActiveStageIndex(stages, -1)).toBeNull();
    expect(findActiveStageIndex(stages, 10)).toBe(1);
    expect(weightAtTimestamp(stages[1]!, 1)).toBe(1);
    expect(weightAtTimestamp(stages[0]!, 15)).toBeLessThan(2);
  });

  it("adds points and builds chart data", () => {
    const data: { timestamp: number; issuancePrice: number }[] = [];
    addPoint(data, 0, 0);
    expect(data).toHaveLength(0);

    addPoint(data, 0, 2);
    expect(data).toHaveLength(1);
    const before = data[0]?.issuancePrice;
    addPoint(data, 0, 4);
    expect(data).toHaveLength(1);
    expect(data[0]?.issuancePrice).not.toBe(before);

    const stages: IssuanceStage[] = [
      {
        stage: 1,
        start: 0,
        end: 2000,
        duration: 1000,
        weight: 1,
        weightCutPercent: 0.5,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
    ];
    const chart = buildChartData(stages, 2);
    expect(chart.length).toBeGreaterThan(0);

    const futureStages: IssuanceStage[] = [
      {
        stage: 1,
        start: 3000,
        end: null,
        duration: 0,
        weight: 1,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
    ];
    expect(buildChartData(futureStages, 1)).toEqual([]);

    const invalidStages: IssuanceStage[] = [
      {
        stage: 1,
        start: 2000,
        end: 1000,
        duration: 0,
        weight: 1,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
    ];
    expect(buildChartData(invalidStages, 3)).toEqual([]);
  });

  it("builds summary for various stage states", () => {
    expect(buildSummary([], null, 0).activeStage).toBeNull();

    const upcomingStages: IssuanceStage[] = [
      {
        stage: 1,
        start: 5000,
        end: null,
        duration: 0,
        weight: 1,
        weightCutPercent: 0,
        reservedPercent: 2500,
        cashOutTaxRate: 0,
      },
    ];
    const upcoming = buildSummary(upcomingStages, null, 1);
    expect(upcoming.nextChangeType).toBe("stage");
    expect(upcoming.activeStage).toBeNull();
    expect(upcoming.reservedPercent).toBe(2500);

    const activeStages: IssuanceStage[] = [
      {
        stage: 1,
        start: 0,
        end: 100000,
        duration: 10,
        weight: 2,
        weightCutPercent: 0.5,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
      {
        stage: 2,
        start: 20000,
        end: null,
        duration: 0,
        weight: 1,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
    ];
    const summary = buildSummary(activeStages, 0, 5);
    expect(summary.nextChangeType).toBe("cut");

    const cutPastEndStages: IssuanceStage[] = [
      {
        stage: 1,
        start: 0,
        end: 5000,
        duration: 10,
        weight: 2,
        weightCutPercent: 0.5,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
      {
        stage: 2,
        start: 6000,
        end: null,
        duration: 0,
        weight: 1,
        weightCutPercent: 0,
        reservedPercent: 0,
        cashOutTaxRate: 0,
      },
    ];
    const summary2 = buildSummary(cutPastEndStages, 0, 4);
    expect(summary2.nextChangeType).toBe("stage");
    expect(summary2.nextStage).toBe(2);
  });
});
