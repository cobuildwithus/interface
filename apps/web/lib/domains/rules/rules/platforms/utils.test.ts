import { describe, expect, it } from "vitest";
import {
  coerceRuleId,
  readNonEmptyString,
  readRulePassedValue,
  unwrapData,
} from "@/lib/domains/rules/rules/platforms/utils";

describe("unwrapData", () => {
  it("returns null for non-objects", () => {
    expect(unwrapData(null)).toBeNull();
    expect(unwrapData([1, 2, 3])).toBeNull();
  });

  it("unwraps a data wrapper when present", () => {
    expect(unwrapData({ data: { ok: true } })).toEqual({ ok: true });
  });

  it("returns the root object when not wrapped", () => {
    expect(unwrapData({ ok: true })).toEqual({ ok: true });
  });
});

describe("readNonEmptyString", () => {
  it("trims and rejects empty strings", () => {
    expect(readNonEmptyString("  hello ")).toBe("hello");
    expect(readNonEmptyString("   ")).toBeNull();
  });
});

describe("readRulePassedValue", () => {
  it("prefers rulePassed and returns undefined when missing", () => {
    expect(readRulePassedValue({ rulePassed: true })).toBe(true);
    expect(readRulePassedValue({})).toBeUndefined();
  });

  it("returns null for non-boolean values", () => {
    expect(readRulePassedValue({ rulePassed: "yes" })).toBeNull();
    expect(readRulePassedValue({ passed: 1 })).toBeNull();
  });

  it("uses passed when rulePassed is missing", () => {
    expect(readRulePassedValue({ passed: false })).toBe(false);
  });
});

describe("coerceRuleId", () => {
  it("coerces numeric values and falls back", () => {
    expect(coerceRuleId(12, 1)).toBe(12);
    expect(coerceRuleId("34", 1)).toBe(34);
    expect(coerceRuleId("invalid", 7)).toBe(7);
  });
});
