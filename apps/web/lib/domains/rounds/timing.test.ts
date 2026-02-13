import { describe, expect, it } from "vitest";
import { getRoundTimingError } from "@/lib/domains/rounds/timing";

describe("getRoundTimingError", () => {
  it("returns not_started when now is before start", () => {
    const startAt = "2024-01-02T00:00:00Z";
    const endAt = "2024-01-03T00:00:00Z";
    const nowMs = Date.parse("2024-01-01T12:00:00Z");
    expect(getRoundTimingError({ startAt, endAt, nowMs })).toEqual({
      code: "not_started",
      message: "This round hasn't started yet.",
    });
  });

  it("returns ended when now is after end", () => {
    const startAt = "2024-01-01T00:00:00Z";
    const endAt = "2024-01-02T00:00:00Z";
    const nowMs = Date.parse("2024-01-02T00:00:00Z");
    expect(getRoundTimingError({ startAt, endAt, nowMs })).toEqual({
      code: "ended",
      message: "This round is over.",
    });
  });

  it("returns null when in range or boundaries invalid", () => {
    const nowMs = Date.parse("2024-01-01T12:00:00Z");
    expect(getRoundTimingError({ startAt: "invalid", endAt: "", nowMs })).toBeNull();
    expect(
      getRoundTimingError({
        startAt: "2024-01-01T00:00:00Z",
        endAt: "2024-01-02T00:00:00Z",
        nowMs,
      })
    ).toBeNull();
  });
});
