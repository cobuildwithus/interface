import { describe, expect, it } from "vitest";
import {
  formatPercent,
  formatTokenAmount,
  formatTokenAmountFull,
  formatUsd,
} from "@/lib/shared/currency/format";

describe("formatUsd", () => {
  it("returns a placeholder for non-finite values", () => {
    expect(formatUsd(Number.NaN)).toBe("—");
    expect(formatUsd(Number.POSITIVE_INFINITY)).toBe("—");
  });

  it("honors precision thresholds and overrides", () => {
    expect(formatUsd(0.005)).toMatch(/\$0\.005/);
    expect(formatUsd(1.234, { maximumFractionDigits: 1 })).toMatch(/\$1\.2/);
  });

  it("formats compact values with currency", () => {
    const compact = formatUsd(1_200, { compact: true });
    expect(compact).toContain("$");
    expect(compact).toMatch(/[KM]/);
  });
});

describe("formatTokenAmount", () => {
  it("returns a placeholder for non-finite values", () => {
    expect(formatTokenAmount(Number.NaN)).toBe("—");
  });

  it("formats small values with precise decimals", () => {
    expect(formatTokenAmount(0)).toBe("0.00");
    expect(formatTokenAmount(0.009)).toBe("0.0090");
    expect(formatTokenAmount(0.005)).toBe("0.0050");
    expect(formatTokenAmount(12)).toBe("12");
    expect(formatTokenAmount(7.4)).toBe("7.4");
  });

  it("adds suffixes for large values", () => {
    expect(formatTokenAmount(1_500)).toBe("1.5K");
    expect(formatTokenAmount(10_000)).toBe("10K");
    expect(formatTokenAmount(2_000_000)).toBe("2M");
    expect(formatTokenAmount(25_000_000)).toBe("25M");
    expect(formatTokenAmount(1_250_000_000)).toBe("1.3B");
    expect(formatTokenAmount(12_000_000_000)).toBe("12B");
  });
});

describe("formatTokenAmountFull", () => {
  it("returns a placeholder for non-finite values", () => {
    expect(formatTokenAmountFull(Number.NaN)).toBe("—");
  });

  it("formats full values without suffixes", () => {
    expect(formatTokenAmountFull(1_234_567)).toBe("1,234,567");
  });
});

describe("formatPercent", () => {
  it("returns a placeholder for non-finite values", () => {
    expect(formatPercent(Number.NaN)).toBe("—");
  });

  it("adds a plus sign when requested", () => {
    expect(formatPercent(12, { showSign: true })).toBe("+12%");
  });

  it("keeps negative signs intact", () => {
    expect(formatPercent(-5, { showSign: true })).toBe("-5%");
  });
});
