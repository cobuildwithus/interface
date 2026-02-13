import { describe, expect, it } from "vitest";

import { normalizeRoundVariant, ROUND_VARIANTS, ROUND_VARIANT_OPTIONS } from "./config";

describe("round variants config", () => {
  it("normalizes unknown variants to default", () => {
    expect(normalizeRoundVariant("unknown")).toBe("default");
    expect(normalizeRoundVariant("")).toBe("default");
    expect(normalizeRoundVariant(undefined)).toBe("default");
    expect(normalizeRoundVariant(null)).toBe("default");
  });

  it("accepts known variants", () => {
    for (const variant of ROUND_VARIANTS) {
      expect(normalizeRoundVariant(variant)).toBe(variant);
    }
  });

  it("keeps variant options in sync with known variants", () => {
    const optionValues = ROUND_VARIANT_OPTIONS.map((option) => option.value);
    expect(optionValues).toEqual(ROUND_VARIANTS);
  });
});
