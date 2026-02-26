import { describe, expect, it } from "vitest";

import { stripEmoji } from "./strip-emoji";

describe("stripEmoji", () => {
  it("removes emoji and trims whitespace", () => {
    expect(stripEmoji("Hello 😀  world")).toBe("Hello world");
  });

  it("preserves regular text and punctuation", () => {
    expect(stripEmoji("Cobuild v2.0!")).toBe("Cobuild v2.0!");
  });
});
