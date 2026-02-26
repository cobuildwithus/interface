import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isRecord } from "./validation";

describe("isRecord", () => {
  it("returns true for objects", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it("returns false for null and primitives", () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord(1)).toBe(false);
    expect(isRecord("x")).toBe(false);
  });
});
