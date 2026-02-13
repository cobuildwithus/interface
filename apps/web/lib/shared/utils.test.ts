import { describe, expect, it } from "vitest";
import { cn, truncateAddress } from "@/lib/shared/utils";

describe("cn", () => {
  it("merges tailwind classes and drops falsy values", () => {
    const result = cn("px-2", "px-4", { "text-sm": true, hidden: false }, null);
    expect(result).toContain("px-4");
    expect(result).toContain("text-sm");
    expect(result).not.toContain("px-2");
    expect(result).not.toContain("hidden");
  });
});

describe("truncateAddress", () => {
  it("returns an empty string for empty input", () => {
    expect(truncateAddress("")).toBe("");
  });

  it("keeps the prefix and suffix with an ellipsis", () => {
    const address = "0x1234567890abcdef";
    expect(truncateAddress(address)).toBe("0x1234…cdef");
  });
});
