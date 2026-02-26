import { describe, expect, it } from "vitest";

import { normalizePostId } from "./normalize-post-id";

describe("normalizePostId", () => {
  it("returns null for non-strings and empty strings", () => {
    expect(normalizePostId(null)).toBeNull();
    expect(normalizePostId(undefined)).toBeNull();
    expect(normalizePostId(123)).toBeNull();
    expect(normalizePostId("")).toBeNull();
    expect(normalizePostId("   ")).toBeNull();
  });

  it("normalizes Farcaster hashes to lowercase with 0x", () => {
    const hex = "A".repeat(40);
    expect(normalizePostId(`0x${hex}`)).toBe(`0x${"a".repeat(40)}`);
    expect(normalizePostId(hex)).toBe(`0x${"a".repeat(40)}`);
  });

  it("passes through X ids and unknown strings trimmed", () => {
    expect(normalizePostId("  1234567890  ")).toBe("1234567890");
    expect(normalizePostId(" not-a-post ")).toBe("not-a-post");
  });
});
