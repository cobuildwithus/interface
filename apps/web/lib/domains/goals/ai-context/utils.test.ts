import { describe, it, expect } from "vitest";
import {
  buildWindowStats,
  mapWindowStats,
  inflowSince,
  issuancePriceFromWeight,
  last,
  median,
  splitWindow,
  sum,
  toUsd,
  valueAtOrBefore,
  DAY_MS,
} from "@/lib/domains/goals/ai-context/utils";

describe("goal-ai-context utils", () => {
  it("converts to USD with rounding and null guards", () => {
    expect(toUsd(1.234, 2)).toBe(2.47);
    expect(toUsd(null, 2)).toBeNull();
    expect(toUsd(1, null)).toBeNull();
    expect(toUsd(Number.NaN, 2)).toBeNull();
  });

  it("derives issuance price from weight", () => {
    expect(issuancePriceFromWeight(null)).toBeNull();
    expect(issuancePriceFromWeight(0)).toBeNull();
    expect(issuancePriceFromWeight(-1)).toBeNull();
    expect(issuancePriceFromWeight(4)).toBeCloseTo(0.25, 6);
  });

  it("computes median for odd, even, and empty sets", () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([Number.NaN, Number.POSITIVE_INFINITY])).toBeNull();
  });

  it("picks the last item when present", () => {
    expect(last([])).toBeNull();
    expect(last([1, 2, 3])).toBe(3);
  });

  it("finds the value at or before a cutoff", () => {
    const data = [{ timestamp: 1 }, { timestamp: 3 }, { timestamp: 5 }];
    expect(valueAtOrBefore(data, 0)).toBeNull();
    expect(valueAtOrBefore(data, 4)).toEqual({ timestamp: 3 });
    expect(valueAtOrBefore(data, 5)).toEqual({ timestamp: 5 });
  });

  it("filters windows based on a cutoff", () => {
    const data = [{ ts: 1 }, { ts: 2 }, { ts: 3 }];
    expect(splitWindow(data, (item) => item.ts, 2)).toEqual([{ ts: 2 }, { ts: 3 }]);
  });

  it("computes inflow deltas and sums", () => {
    expect(inflowSince(10.123, { balance: 7 })).toBe(3.12);
    expect(inflowSince(null, { balance: 7 })).toBeNull();
    expect(inflowSince(10, null)).toBeNull();
    expect(sum([])).toBeNull();
    expect(sum([1, 2, 3])).toBe(6);
  });

  it("builds and maps window stats", () => {
    const now = 100_000;
    const windows = buildWindowStats(now, (cutoffMs) => cutoffMs);
    expect(windows).toEqual({
      last6h: now - 0.25 * DAY_MS,
      last24h: now - 1 * DAY_MS,
      last7d: now - 7 * DAY_MS,
      last30d: now - 30 * DAY_MS,
    });
    const mapped = mapWindowStats(
      { last6h: 0.5, last24h: 1, last7d: 2, last30d: null },
      (value) => value * 2
    );
    expect(mapped).toEqual({ last6h: 1, last24h: 2, last7d: 4, last30d: null });
  });
});
