import { describe, expect, it } from "vitest";

// Test the toFiniteNumber function behavior by testing it inline
// since it's not exported. We test by creating mock Decimal-like objects.

describe("Decimal handling in rounds", () => {
  type Decimalish = { toNumber?: () => number; valueOf?: () => number | string | bigint | object };
  type DecimalInput = number | bigint | string | Decimalish | null | undefined;

  function toFiniteNumber(value: DecimalInput): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "bigint") {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    }
    if (value && typeof value === "object") {
      const decimalish = value as Decimalish;
      if (typeof decimalish.toNumber === "function") {
        const num = decimalish.toNumber();
        return Number.isFinite(num) ? num : null;
      }
      if (typeof decimalish.valueOf === "function") {
        const num = Number(decimalish.valueOf());
        return Number.isFinite(num) ? num : null;
      }
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  it("handles plain numbers", () => {
    expect(toFiniteNumber(0.5)).toBe(0.5);
    expect(toFiniteNumber(100)).toBe(100);
    expect(toFiniteNumber(0)).toBe(0);
  });

  it("handles bigint", () => {
    expect(toFiniteNumber(BigInt(123))).toBe(123);
    expect(toFiniteNumber(BigInt(0))).toBe(0);
  });

  it("handles Prisma Decimal-like objects with toNumber", () => {
    const decimal = { toNumber: () => 0.333333 };
    expect(toFiniteNumber(decimal)).toBe(0.333333);
  });

  it("handles objects with valueOf", () => {
    const decimal = { valueOf: () => 0.5 };
    expect(toFiniteNumber(decimal)).toBe(0.5);
  });

  it("handles string numbers", () => {
    expect(toFiniteNumber("0.123456")).toBe(0.123456);
    expect(toFiniteNumber("100")).toBe(100);
  });

  it("returns null for null/undefined", () => {
    expect(toFiniteNumber(null)).toBe(null);
    expect(toFiniteNumber(undefined)).toBe(null);
  });

  it("returns null for non-finite numbers", () => {
    expect(toFiniteNumber(Infinity)).toBe(null);
    expect(toFiniteNumber(NaN)).toBe(null);
    expect(toFiniteNumber({ toNumber: () => Infinity })).toBe(null);
  });

  it("returns null for empty string", () => {
    expect(toFiniteNumber("")).toBe(null);
    expect(toFiniteNumber("   ")).toBe(null);
  });

  it("returns null for invalid string", () => {
    expect(toFiniteNumber("not a number")).toBe(null);
  });
});
