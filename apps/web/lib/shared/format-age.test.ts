import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { formatAge } from "./format-age";

describe("formatAge", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-10T12:00:00.000Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("formats recent dates with day-based thresholds", () => {
    const now = new Date();

    expect(formatAge(new Date(now.getTime() - 12 * 60 * 60 * 1000))).toBe("today");
    expect(formatAge(new Date(now.getTime() - 24 * 60 * 60 * 1000))).toBe("1d old");
    expect(formatAge(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000))).toBe("3d old");
  });

  it("formats weeks, months, and years", () => {
    const now = new Date();

    expect(formatAge(new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000))).toBe("2w old");
    expect(formatAge(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000))).toBe("3mo old");
    expect(formatAge(new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000))).toBe("1y old");
  });
});
