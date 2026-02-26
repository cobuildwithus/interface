import { describe, expect, it } from "vitest";
import {
  roundToCents,
  toFiniteNumber,
  toDecimalString,
  fromBaseUnits,
  toBigIntSafe,
} from "./numbers";
import { formatPercent, formatTokenAmount, formatUsd } from "./currency/format";

describe("toFiniteNumber", () => {
  it("returns numbers unchanged", () => {
    expect(toFiniteNumber(1.23)).toBe(1.23);
    expect(toFiniteNumber(0)).toBe(0);
  });

  it("converts bigint", () => {
    expect(toFiniteNumber(BigInt(42))).toBe(42);
  });

  it("parses numeric strings", () => {
    expect(toFiniteNumber("3.14")).toBe(3.14);
  });

  it("supports Decimal-like objects", () => {
    const decimalish = { toNumber: () => 9.99 };
    expect(toFiniteNumber(decimalish)).toBe(9.99);
  });

  it("supports valueOf fallback", () => {
    const decimalish = { valueOf: () => "2.5" };
    expect(toFiniteNumber(decimalish)).toBe(2.5);
  });

  it("returns null for invalid or non-finite inputs", () => {
    expect(toFiniteNumber(Infinity)).toBeNull();
    expect(toFiniteNumber(NaN)).toBeNull();
    expect(toFiniteNumber("not a number")).toBeNull();
    expect(toFiniteNumber("   ")).toBeNull();
    expect(toFiniteNumber(undefined)).toBeNull();
  });

  it("returns null for non-finite from Decimal-like", () => {
    const decimalish = { toNumber: () => Infinity };
    expect(toFiniteNumber(decimalish)).toBeNull();
  });
});

describe("roundToCents", () => {
  it("rounds to two decimals", () => {
    expect(roundToCents(1.234)).toBe(1.23);
    expect(roundToCents(1.235)).toBe(1.24);
  });

  it("returns 0 for non-finite", () => {
    expect(roundToCents(Number.POSITIVE_INFINITY)).toBe(0);
    expect(roundToCents(Number.NaN)).toBe(0);
  });
});

describe("toDecimalString", () => {
  it("handles primitives and objects", () => {
    expect(toDecimalString("123")).toBe("123");
    expect(toDecimalString(45.6)).toBe("45.6");
    expect(toDecimalString(7n)).toBe("7");
    expect(toDecimalString({ toString: () => "custom" })).toBe("custom");
  });

  it("falls back to 0 for invalid inputs", () => {
    expect(toDecimalString(undefined)).toBe("0");
    expect(toDecimalString(null)).toBe("0");
  });
});

describe("fromBaseUnits", () => {
  it("converts base units to a number", () => {
    expect(fromBaseUnits("1000", 3)).toBe(1);
    expect(fromBaseUnits(1000n, 3)).toBe(1);
  });

  it("returns 0 for invalid inputs", () => {
    expect(fromBaseUnits("not-a-number", 3)).toBe(0);
  });
});

describe("toBigIntSafe", () => {
  it("handles bigint and numbers", () => {
    expect(toBigIntSafe(10n)).toBe(10n);
    expect(toBigIntSafe(42)).toBe(42n);
    expect(toBigIntSafe(42.9)).toBe(42n);
  });

  it("handles Decimal-like objects", () => {
    const decimalish = { toFixed: () => "1234500000000000000" };
    expect(toBigIntSafe(decimalish)).toBe(1234500000000000000n);
  });

  it("handles scientific notation strings", () => {
    expect(toBigIntSafe("2.5e3")).toBe(2500n);
    expect(toBigIntSafe("1e0")).toBe(1n);
  });
});

describe("currency/format", () => {
  it("formats USD values across thresholds", () => {
    expect(formatUsd(Number.NaN)).toBe("—");
    expect(formatUsd(0)).toContain("$");
    expect(formatUsd(0.001)).toContain("$");
    expect(formatUsd(0.05)).toContain("$");
    expect(formatUsd(1)).toContain("$");
    expect(formatUsd(6)).toContain("$");
    expect(formatUsd(12)).toContain("$");
    expect(formatUsd(1234, { compact: true })).toContain("$");
  });

  it("formats token amounts with suffixes and fallback", () => {
    expect(formatTokenAmount(Number.NaN)).toBe("—");
    expect(formatTokenAmount(12.34)).toBe("12");
    expect(formatTokenAmount(999.9)).toBe("1000");
    expect(formatTokenAmount(1_000)).toMatch(/K$/);
    expect(formatTokenAmount(1_000_000)).toMatch(/M$/);
    expect(formatTokenAmount(1_000_000_000)).toMatch(/B$/);
  });

  it("formats percents with optional sign", () => {
    expect(formatPercent(Number.NaN)).toBe("—");
    expect(formatPercent(12.34)).toContain("%");
    expect(formatPercent(12.34, { showSign: true })).toContain("+");
  });
});
