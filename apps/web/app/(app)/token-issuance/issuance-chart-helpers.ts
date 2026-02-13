import { formatPriceValue, toIssuancePrice } from "./issuance-format";
import type { IssuancePoint, IssuanceSummary } from "@/lib/domains/token/juicebox/issuance-terms";

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

type RangeBounds = {
  start: number;
  end: number;
};

export function getRangeBounds({
  chartStart,
  chartEnd,
  rangeYears,
  now,
}: {
  chartStart: number;
  chartEnd: number;
  rangeYears: number | null;
  now: number;
}): RangeBounds {
  if (rangeYears === null) {
    return { start: chartStart, end: chartEnd };
  }
  const rangeMs = rangeYears * YEAR_MS;
  const revnetAgeMs = now - chartStart;

  // If range is less than revnet's age, show historical: (now - range) to now
  if (rangeMs < revnetAgeMs) {
    return { start: now - rangeMs, end: now };
  }
  // Otherwise show from chartStart extending forward
  const end = Math.min(chartEnd, chartStart + rangeMs);
  return { start: chartStart, end: Math.max(end, chartStart) };
}

export function sliceIssuanceData({
  data,
  rangeBounds,
}: {
  data: IssuancePoint[];
  rangeBounds: RangeBounds;
}): IssuancePoint[] {
  if (data.length === 0) return [];
  const { start, end } = rangeBounds;

  let startIndex = data.findIndex((point) => point.timestamp >= start);
  if (startIndex === -1) startIndex = data.length - 1;
  const anchorIndex = Math.max(0, startIndex - 1);
  const anchorPoint = data[anchorIndex]!;

  const sliced: IssuancePoint[] = [{ ...anchorPoint, timestamp: start }];
  const loopStart = startIndex === 0 ? 1 : startIndex;
  for (let i = loopStart; i < data.length; i += 1) {
    const point = data[i]!;
    if (point.timestamp > end) break;
    sliced.push(point);
  }

  const last = sliced[sliced.length - 1]!;
  if (last && last.timestamp < end) {
    sliced.push({ ...last, timestamp: end });
  }
  return sliced;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function interpolateIssuanceData({
  data,
  rangeBounds,
}: {
  data: IssuancePoint[];
  rangeBounds: RangeBounds;
}): IssuancePoint[] {
  if (data.length === 0) return [];

  const rangeMs = rangeBounds.end - rangeBounds.start;
  // Aim for ~100 points for smooth hover, but at least weekly intervals
  const interval = Math.max(WEEK_MS, Math.floor(rangeMs / 100));

  const result: IssuancePoint[] = [];

  // Find the starting data index - the last point at or before rangeBounds.start
  let dataIndex = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i]!.timestamp <= rangeBounds.start) {
      dataIndex = i;
    } else {
      break;
    }
  }

  for (let t = rangeBounds.start; t <= rangeBounds.end; t += interval) {
    // Find the price at this timestamp (stepAfter logic: use the last point at or before t)
    while (dataIndex < data.length - 1 && data[dataIndex + 1]!.timestamp <= t) {
      dataIndex++;
    }
    const price = data[dataIndex]!.issuancePrice;
    result.push({ timestamp: t, issuancePrice: price });
  }

  // Ensure we include the end point
  const lastPoint = result[result.length - 1];
  if (lastPoint && lastPoint.timestamp < rangeBounds.end) {
    while (dataIndex < data.length - 1 && data[dataIndex + 1]!.timestamp <= rangeBounds.end) {
      dataIndex++;
    }
    result.push({ timestamp: rangeBounds.end, issuancePrice: data[dataIndex]!.issuancePrice });
  }

  return result;
}

export function getTickIndices(data: IssuancePoint[]): number[] {
  if (data.length <= 1) return [];
  const step = Math.max(1, Math.floor(data.length / 6));
  return data.map((_, i) => i).filter((i) => i % step === 0 || i === data.length - 1);
}

type NextChangeMeta = {
  prefix: string;
  priceLabel: string;
  timeRemaining: string;
  direction: "up" | "down" | "flat" | "update";
};

export function getNextChangeMeta({
  summary,
  now,
  baseSymbol,
}: {
  summary: IssuanceSummary;
  now: number;
  baseSymbol: string;
}): NextChangeMeta | null {
  if (!summary.nextChangeAt || summary.nextIssuance == null) {
    return null;
  }
  const nextPrice = toIssuancePrice(summary.nextIssuance);
  if (nextPrice == null) return null;
  const timeRemaining = formatTimeRemaining(summary.nextChangeAt - now);
  const nextLabel = formatPriceLabel(nextPrice, baseSymbol);
  const currentPrice = toIssuancePrice(summary.currentIssuance);

  if (currentPrice == null) {
    return {
      prefix: "Price updates to",
      priceLabel: nextLabel,
      timeRemaining,
      direction: "update",
    };
  }

  const direction = getPriceDirection(currentPrice, nextPrice);
  if (direction === "up") {
    return {
      prefix: "Price increases to",
      priceLabel: nextLabel,
      timeRemaining,
      direction,
    };
  }
  if (direction === "down") {
    return {
      prefix: "Price decreases to",
      priceLabel: nextLabel,
      timeRemaining,
      direction,
    };
  }
  return {
    prefix: "Price stays at",
    priceLabel: nextLabel,
    timeRemaining,
    direction,
  };
}

export function formatDate(timestamp: number, rangeYears: number | null): string {
  const date = new Date(timestamp);
  if (rangeYears === null || rangeYears >= 10) {
    return date.toLocaleDateString("en-US", { year: "numeric" });
  }
  if (rangeYears < 0.5) {
    // Less than 6 months: show day
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (rangeYears <= 1) {
    return date.toLocaleDateString("en-US", { month: "short" });
  }
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function getPriceDirection(current: number, next: number): "up" | "down" | "flat" {
  if (next > current) return "up";
  if (next < current) return "down";
  return "flat";
}

function formatTimeRemaining(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "soon";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days} day${days === 1 ? "" : "s"}`;
  if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  if (minutes > 0) return `${minutes} min`;
  return "soon";
}

function formatPriceLabel(price: number, baseSymbol: string): string {
  return `${formatPriceValue(price)} ${baseSymbol}`;
}
