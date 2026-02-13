import { describe, expect, it } from "vitest";
import { truncateWords } from "@/lib/shared/text/truncate-words";

describe("truncateWords", () => {
  it("returns the fallback for empty or whitespace input", () => {
    expect(truncateWords("   ", 3)).toBe("Submission");
    expect(truncateWords("\n\t", 2, "Fallback")).toBe("Fallback");
  });

  it("preserves text when within max words", () => {
    expect(truncateWords("  hello world ", 2)).toBe("hello world");
  });

  it("truncates by word count and adds an ellipsis", () => {
    expect(truncateWords("hello world there", 2)).toBe("hello world…");
  });
});
