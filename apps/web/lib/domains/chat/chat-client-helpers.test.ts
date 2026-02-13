import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import {
  buildChatMessageState,
  formatReasoningDuration,
  formatThoughtLabel,
  shouldShowThinking,
} from "@/lib/domains/chat/chat-client-helpers";

describe("formatReasoningDuration", () => {
  it("formats seconds for short durations", () => {
    expect(formatReasoningDuration(900)).toBe("1s");
    expect(formatReasoningDuration(12_345)).toBe("12s");
  });

  it("formats minutes and seconds", () => {
    expect(formatReasoningDuration(65_000)).toBe("1m 5s");
  });

  it("returns empty for invalid values", () => {
    expect(formatReasoningDuration(Number.NaN)).toBe("");
    expect(formatReasoningDuration(-10)).toBe("");
  });
});

describe("formatThoughtLabel", () => {
  it("returns empty when duration is null", () => {
    expect(formatThoughtLabel(null)).toBe("");
  });

  it("returns formatted label when duration is valid", () => {
    expect(formatThoughtLabel(12_345)).toBe("Thought for 12s");
  });
});

describe("buildChatMessageState", () => {
  it("tracks visible messages and last user text", () => {
    const messages = [
      { id: "sys", role: "system", parts: [{ type: "text", text: "hidden" }] },
      { id: "u1", role: "user", parts: [{ type: "text", text: "Hi" }] },
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "Hello" }] },
    ] as UIMessage[];

    const state = buildChatMessageState(messages);
    expect(state.visibleMessages).toHaveLength(2);
    expect(state.lastUserText).toBe("Hi");
    expect(state.activeAssistantText).toBe("Hello");
    expect(state.activeAssistantIndex).toBe(1);
    expect(state.activeAssistantMessage?.id).toBe("a1");
    expect(state.hasPendingAssistant).toBe(false);
  });

  it("clears active assistant when user sends a newer message", () => {
    const messages = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "First" }] },
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "Reply" }] },
      { id: "u2", role: "user", parts: [{ type: "text", text: "Follow up" }] },
    ] as UIMessage[];

    const state = buildChatMessageState(messages);
    expect(state.activeAssistantText).toBe("");
    expect(state.lastUserText).toBe("Follow up");
    expect(state.activeAssistantIndex).toBe(-1);
    expect(state.activeAssistantMessage).toBe(null);
    expect(state.hasPendingAssistant).toBe(false);
  });

  it("filters pending assistant messages and reports pending state", () => {
    const messages = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "Hello" }] },
      { id: "p1", role: "assistant", parts: [], metadata: { pending: true } },
    ] as UIMessage[];

    const state = buildChatMessageState(messages);
    expect(state.visibleMessages).toHaveLength(1);
    expect(state.visibleMessages[0]?.id).toBe("u1");
    expect(state.hasPendingAssistant).toBe(true);
  });
});

describe("shouldShowThinking", () => {
  const base = {
    shouldShowConnect: false,
    hasPendingAssistant: false,
    isSubmitted: false,
    isStreaming: false,
    activeAssistantText: "",
  };

  it("keeps thinking visible until readable text appears", () => {
    expect(shouldShowThinking({ ...base, isStreaming: true })).toBe(true);
    expect(shouldShowThinking({ ...base, isStreaming: true, activeAssistantText: "Hi" })).toBe(
      false
    );
  });

  it("shows thinking while a pending assistant exists with no text", () => {
    expect(shouldShowThinking({ ...base, hasPendingAssistant: true })).toBe(true);
  });

  it("never shows thinking when connect is required", () => {
    expect(
      shouldShowThinking({
        ...base,
        shouldShowConnect: true,
        isStreaming: true,
      })
    ).toBe(false);
  });

  it("hides thinking when nothing is streaming or pending", () => {
    expect(shouldShowThinking(base)).toBe(false);
  });
});
