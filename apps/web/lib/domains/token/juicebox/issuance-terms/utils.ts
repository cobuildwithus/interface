import { toFiniteNumber, type Numberish } from "@/lib/shared/numbers";
import { WEIGHT_CUT_SCALE, WEIGHT_SCALE } from "./constants";
import type {
  IssuancePoint,
  IssuanceStage,
  IssuanceSummary,
  ParsedRuleset,
  RawRuleset,
} from "./types";

export function toNumber(value: Numberish): number {
  return toFiniteNumber(value) ?? 0;
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function parseRuleset(rule: RawRuleset): ParsedRuleset {
  return {
    chainId: rule.chainId,
    projectId: rule.projectId,
    rulesetId: rule.rulesetId,
    start: Number(rule.start),
    duration: Number(rule.duration),
    weight: toNumber(rule.weight) / WEIGHT_SCALE,
    weightCutPercent: toNumber(rule.weightCutPercent) / WEIGHT_CUT_SCALE,
    reservedPercent: rule.reservedPercent,
    cashOutTaxRate: rule.cashOutTaxRate,
  };
}

export function findActiveStageIndex(stages: IssuanceStage[], nowSec: number): number | null {
  for (let i = stages.length - 1; i >= 0; i -= 1) {
    const stage = stages[i]!;
    const startSec = Math.floor(stage.start / 1000);
    const endSec = stage.end ? Math.floor(stage.end / 1000) : null;
    if (nowSec >= startSec && (endSec === null || nowSec < endSec)) {
      return i;
    }
  }
  return null;
}

export function weightAtTimestamp(stage: IssuanceStage, timestampSec: number): number {
  const startSec = Math.floor(stage.start / 1000);
  if (timestampSec < startSec) return stage.weight;
  const duration = stage.duration;
  const cut = clamp(stage.weightCutPercent, 0, 1);
  if (duration <= 0 || cut <= 0) return stage.weight;
  const cycles = Math.max(0, Math.floor((timestampSec - startSec) / duration));
  return stage.weight * Math.pow(1 - cut, cycles);
}

export function addPoint(data: IssuancePoint[], timestampSec: number, weight: number) {
  if (!Number.isFinite(weight) || weight <= 0) return;
  const issuancePrice = 1 / weight;
  if (!Number.isFinite(issuancePrice)) return;
  const timestamp = timestampSec * 1000;
  const last = data[data.length - 1];
  if (last?.timestamp === timestamp) {
    last.issuancePrice = issuancePrice;
    return;
  }
  data.push({ timestamp, issuancePrice });
}

export function buildChartData(stages: IssuanceStage[], horizonSec: number): IssuancePoint[] {
  const data: IssuancePoint[] = [];
  const horizon = Math.max(0, horizonSec);

  for (const stage of stages) {
    const startSec = Math.floor(stage.start / 1000);
    if (startSec > horizon) break;
    const endSec = stage.end ? Math.min(Math.floor(stage.end / 1000), horizon) : horizon;
    if (endSec < startSec) continue;

    let currentWeight = stage.weight;
    addPoint(data, startSec, currentWeight);

    const duration = stage.duration;
    const cut = clamp(stage.weightCutPercent, 0, 1);

    if (duration > 0 && cut > 0) {
      const factor = 1 - cut;
      for (let cutTime = startSec + duration; cutTime <= endSec; cutTime += duration) {
        currentWeight *= factor;
        addPoint(data, cutTime, currentWeight);
      }
    }

    const lastPoint = data[data.length - 1];
    const lastSec = lastPoint ? Math.floor(lastPoint.timestamp / 1000) : startSec;
    if (lastSec < endSec) {
      addPoint(data, endSec, currentWeight);
    }
  }

  return data;
}

export function buildSummary(
  stages: IssuanceStage[],
  activeStageIndex: number | null,
  nowSec: number
): IssuanceSummary {
  if (stages.length === 0) {
    return {
      currentIssuance: null,
      nextIssuance: null,
      nextChangeAt: null,
      nextChangeType: null,
      reservedPercent: null,
      activeStage: null,
      nextStage: null,
    };
  }

  if (activeStageIndex === null) {
    const upcomingStage =
      stages.find((stage) => Math.floor(stage.start / 1000) > nowSec) ?? stages[0];
    const startSec = Math.floor(upcomingStage.start / 1000);
    return {
      currentIssuance: upcomingStage.weight,
      nextIssuance: upcomingStage.weight,
      nextChangeAt: startSec * 1000,
      nextChangeType: "stage",
      reservedPercent: upcomingStage.reservedPercent,
      activeStage: null,
      nextStage: upcomingStage.stage,
    };
  }

  const activeStage = stages[activeStageIndex]!;
  const currentIssuance = weightAtTimestamp(activeStage, nowSec);
  const currentSec = nowSec;
  let nextIssuance: number | null = null;
  let nextChangeAt: number | null = null;
  let nextChangeType: "cut" | "stage" | null = null;
  let nextStage: number | null = null;

  if (activeStage.duration > 0 && activeStage.weightCutPercent > 0) {
    const startSec = Math.floor(activeStage.start / 1000);
    const cycles = Math.max(0, Math.floor((currentSec - startSec) / activeStage.duration));
    const nextCutSec = startSec + (cycles + 1) * activeStage.duration;
    const endSec = activeStage.end ? Math.floor(activeStage.end / 1000) : null;
    if (endSec === null || nextCutSec < endSec) {
      nextChangeAt = nextCutSec * 1000;
      nextChangeType = "cut";
      nextIssuance = weightAtTimestamp(activeStage, nextCutSec);
    }
  }

  if (nextChangeAt === null) {
    const nextStageIndex = activeStageIndex + 1;
    if (nextStageIndex < stages.length) {
      const stage = stages[nextStageIndex]!;
      nextChangeAt = stage.start;
      nextChangeType = "stage";
      nextIssuance = stage.weight;
      nextStage = stage.stage;
    }
  }

  return {
    currentIssuance,
    nextIssuance,
    nextChangeAt,
    nextChangeType,
    reservedPercent: activeStage.reservedPercent,
    activeStage: activeStage.stage,
    nextStage,
  };
}
