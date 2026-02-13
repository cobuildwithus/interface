import { describe, expect, it } from "vitest";
import {
  adjustForReserved,
  cashOutValueFromCoefficients,
  cashOutValuePerToken,
  getActiveRuleset,
  issuancePriceAtTimestamp,
  parseRuleset,
  toBigInt,
  toNumber,
  totalSupplyFromBaseUnits,
} from "./helpers";
import { TOKEN_DECIMALS, WEIGHT_CUT_SCALE, WEIGHT_SCALE } from "./constants";
import type { RawRuleset } from "./types";

describe("issuance cashout history helpers", () => {
  it("parses and normalizes rulesets", () => {
    const raw: RawRuleset = {
      chainId: 8453,
      projectId: 1,
      rulesetId: 1n,
      start: 0n,
      duration: 10n,
      weight: WEIGHT_SCALE * 2,
      weightCutPercent: WEIGHT_CUT_SCALE / 2,
      reservedPercent: 5000,
      cashOutTaxRate: 2500,
    };

    const parsed = parseRuleset(raw);
    expect(parsed.weight).toBe(2);
    expect(parsed.weightCutPercent).toBe(0.5);
  });

  it("handles numeric conversions", () => {
    expect(toNumber("1.5")).toBe(1.5);
    expect(toNumber("bad")).toBe(0);
    expect(toBigInt(42)).toBe(42n);
    expect(
      toBigInt({
        toFixed: () => {
          throw new Error("boom");
        },
      })
    ).toBe(0n);
  });

  it("selects active ruleset by timestamp", () => {
    const rulesets = [
      { start: 0, duration: 0, weight: 1, weightCutPercent: 0 } as const,
      { start: 100, duration: 0, weight: 2, weightCutPercent: 0 } as const,
    ];

    expect(getActiveRuleset(rulesets as never, 50)?.weight).toBe(1);
    expect(getActiveRuleset(rulesets as never, 150)?.weight).toBe(2);
    expect(getActiveRuleset(rulesets as never, -1)).toBeUndefined();
  });

  it("computes issuance price and cashout values", () => {
    const ruleset = { start: 0, duration: 0, weight: 1, weightCutPercent: 0 } as const;
    expect(issuancePriceAtTimestamp(ruleset as never, 0)).toBe(1);
    expect(
      issuancePriceAtTimestamp(
        { start: 0, duration: 10, weight: 1, weightCutPercent: 2 } as never,
        10
      )
    ).toBeNull();
    expect(issuancePriceAtTimestamp({ ...ruleset, weight: 0 } as never, 0)).toBeNull();

    expect(cashOutValuePerToken(0n, 100n, 0, TOKEN_DECIMALS)).toBe(0);
    expect(cashOutValuePerToken(100n, 0n, 0, TOKEN_DECIMALS)).toBe(0);
    expect(cashOutValuePerToken(1000n, 100n, 0, TOKEN_DECIMALS)).toBeGreaterThan(0);

    expect(cashOutValueFromCoefficients(0n, 0n, TOKEN_DECIMALS)).toBe(0);
    expect(cashOutValueFromCoefficients(1n, 2n, TOKEN_DECIMALS)).toBeGreaterThan(0);
  });

  it("adjusts reserved supply and converts totals", () => {
    expect(adjustForReserved(100n, 10000)).toBe(100n);
    expect(adjustForReserved(100n, 5000)).toBe(200n);
    expect(totalSupplyFromBaseUnits(10n ** 18n)).toBe(1);
  });
});
