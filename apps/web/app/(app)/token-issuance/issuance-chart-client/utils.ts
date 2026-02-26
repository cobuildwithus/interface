import { RANGE_OPTIONS } from "./constants";
import type { CombinedDataPoint, RangeOption } from "./types";

export const getDefaultRange = (chartStart: number, now: number): RangeOption => {
  const ageMs = now - chartStart;
  const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
  const targetYears = ageYears * 1.5;

  for (const option of RANGE_OPTIONS) {
    if (option.years !== null && option.years >= targetYears) {
      return option;
    }
  }
  return RANGE_OPTIONS[RANGE_OPTIONS.length - 1]!;
};

type BuildCombinedDataInput = {
  displayData: { timestamp: number; issuancePrice: number }[];
  cashoutHistory: { timestamp: number; cashOutValue: number }[];
  rangeBounds: { start: number; end: number };
  now: number;
};

export const buildCombinedData = ({
  displayData,
  cashoutHistory,
  rangeBounds,
  now,
}: BuildCombinedDataInput): CombinedDataPoint[] => {
  const result: CombinedDataPoint[] = [];

  const allTimestamps = new Set<number>();
  for (const point of displayData) {
    if (point.timestamp >= rangeBounds.start && point.timestamp <= rangeBounds.end) {
      allTimestamps.add(point.timestamp);
    }
  }
  for (const point of cashoutHistory) {
    if (point.timestamp >= rangeBounds.start && point.timestamp <= rangeBounds.end) {
      allTimestamps.add(point.timestamp);
    }
  }

  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

  let lastIssuancePrice = displayData[0]?.issuancePrice ?? 0;
  let lastFloorPrice: number | undefined;

  for (const point of cashoutHistory) {
    if (point.timestamp <= rangeBounds.start) {
      lastFloorPrice = point.cashOutValue;
    } else {
      break;
    }
  }

  let issuanceIdx = 0;
  let cashoutIdx = 0;

  for (const timestamp of sortedTimestamps) {
    while (issuanceIdx < displayData.length && displayData[issuanceIdx]!.timestamp <= timestamp) {
      lastIssuancePrice = displayData[issuanceIdx]!.issuancePrice;
      issuanceIdx++;
    }

    while (
      cashoutIdx < cashoutHistory.length &&
      cashoutHistory[cashoutIdx]!.timestamp <= timestamp
    ) {
      lastFloorPrice = cashoutHistory[cashoutIdx]!.cashOutValue;
      cashoutIdx++;
    }

    const includeFloorPrice = timestamp <= now && lastFloorPrice !== undefined;

    result.push({
      timestamp,
      issuancePrice: lastIssuancePrice,
      floorPrice: includeFloorPrice ? lastFloorPrice : undefined,
    });
  }

  return result;
};

export const getYDomain = (combinedData: CombinedDataPoint[]) => {
  const values: number[] = [];
  for (const point of combinedData) {
    values.push(point.issuancePrice);
    if (point.floorPrice !== undefined) {
      values.push(point.floorPrice);
    }
  }
  if (values.length === 0) return ["auto", "auto"] as const;
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return ["auto", "auto"] as const;
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.1;
    return [Math.max(0, min - pad), max + pad] as const;
  }
  const padding = (max - min) * 0.08;
  min = Math.max(0, min - padding);
  max += padding;
  return [min, max] as const;
};
