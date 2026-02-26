import { roundToCents } from "@/lib/shared/numbers";
import type { WindowStats } from "@/lib/domains/goals/ai-context/types";

export const DAY_MS = 24 * 60 * 60 * 1000;

export function toUsd(value: number | null, priceUsd: number | null): number | null {
  if (value === null || priceUsd === null) return null;
  if (!Number.isFinite(value) || !Number.isFinite(priceUsd)) return null;
  return roundToCents(value * priceUsd);
}

export function issuancePriceFromWeight(weight: number | null): number | null {
  if (weight === null || !Number.isFinite(weight) || weight <= 0) return null;
  const price = 1 / weight;
  return Number.isFinite(price) ? price : null;
}

export function median(values: number[]): number | null {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (filtered.length === 0) return null;
  const sorted = filtered.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function last<T>(items: T[]): T | null {
  return items.length > 0 ? items.at(-1)! : null;
}

export function valueAtOrBefore<T extends { timestamp: number }>(
  data: T[],
  cutoffMs: number
): T | null {
  let match: T | null = null;
  for (const point of data) {
    if (point.timestamp <= cutoffMs) {
      match = point;
    } else {
      break;
    }
  }
  return match;
}

export function splitWindow<T>(
  items: T[],
  getTimestampMs: (item: T) => number,
  cutoffMs: number
): T[] {
  return items.filter((item) => getTimestampMs(item) >= cutoffMs);
}

export function inflowSince(
  balance: number | null,
  point: { balance: number } | null
): number | null {
  if (balance === null || !point) return null;
  return roundToCents(balance - point.balance);
}

export function sum(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0);
}

export function buildWindowStats<T>(nowMs: number, build: (cutoffMs: number) => T): WindowStats<T> {
  return {
    last6h: build(nowMs - 0.25 * DAY_MS),
    last24h: build(nowMs - 1 * DAY_MS),
    last7d: build(nowMs - 7 * DAY_MS),
    last30d: build(nowMs - 30 * DAY_MS),
  };
}

export function mapWindowStats<T, R>(
  stats: WindowStats<T>,
  map: (value: T) => R | null
): WindowStats<R> {
  return {
    last6h: stats.last6h === null ? null : map(stats.last6h),
    last24h: stats.last24h === null ? null : map(stats.last24h),
    last7d: stats.last7d === null ? null : map(stats.last7d),
    last30d: stats.last30d === null ? null : map(stats.last30d),
  };
}
