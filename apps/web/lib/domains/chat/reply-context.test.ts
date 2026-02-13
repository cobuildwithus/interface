import { describe, expect, it } from "vitest";
import { buildReplyPrefix, formatReplyQuote } from "@/lib/domains/chat/reply-context";

describe("reply-context", () => {
  it("formats quoted text with line prefixes", () => {
    expect(formatReplyQuote(" hello\nworld ")).toBe("> hello\n> world");
  });

  it("builds a reply prefix from multiple items", () => {
    const prefix = buildReplyPrefix([
      { id: "1", messageKey: "m1", text: "First line" },
      { id: "2", messageKey: "m2", text: "Second\nLine" },
    ]);

    expect(prefix).toBe("> First line\n\n> Second\n> Line");
  });
});
