import { describe, expect, it } from "vitest";
import type { ToolUIPart, UIMessage } from "ai";
import {
  getMessageFiles,
  getMessageKey,
  getMessageReasoning,
  getMessageReasoningDurationMs,
  getMessageText,
  getMessageThoughtParts,
  getMessageToolParts,
  getWebSearchSources,
  isPendingAssistantMessage,
} from "@/lib/domains/chat/messages";

describe("getMessageText", () => {
  it("returns joined text parts", () => {
    const message: UIMessage = {
      id: "1",
      role: "assistant",
      parts: [
        { type: "text", text: "Hello " },
        { type: "text", text: "world" },
      ],
    };

    expect(getMessageText(message)).toBe("Hello world");
  });

  it("ignores non-text parts", () => {
    const message: UIMessage = {
      id: "2",
      role: "assistant",
      parts: [{ type: "step-start" }, { type: "text", text: "Done" }],
    };

    expect(getMessageText(message)).toBe("Done");
  });

  it("returns empty string when no text parts exist", () => {
    const message: UIMessage = {
      id: "3",
      role: "assistant",
      parts: [{ type: "step-start" }],
    };

    expect(getMessageText(message)).toBe("");
  });
});

describe("getMessageReasoning", () => {
  it("returns joined reasoning parts", () => {
    const message: UIMessage = {
      id: "6",
      role: "assistant",
      parts: [
        { type: "reasoning", text: "Considering incentives " },
        { type: "reasoning", text: "for protocol design" },
      ],
    };

    expect(getMessageReasoning(message)).toBe("Considering incentives for protocol design");
  });

  it("ignores non-reasoning parts", () => {
    const message: UIMessage = {
      id: "7",
      role: "assistant",
      parts: [{ type: "text", text: "Answer" }],
    };

    expect(getMessageReasoning(message)).toBe("");
  });
});

describe("getMessageFiles", () => {
  it("returns file parts from message parts", () => {
    const message: UIMessage = {
      id: "10",
      role: "user",
      parts: [
        { type: "file", url: "https://example.com/a.png", mediaType: "image/png" },
        { type: "text", text: "hello" },
      ],
    };

    expect(getMessageFiles(message)).toEqual([
      { type: "file", url: "https://example.com/a.png", mediaType: "image/png" },
    ]);
  });

  it("returns empty array when no file parts exist", () => {
    const message: UIMessage = {
      id: "12",
      role: "assistant",
      parts: [{ type: "text", text: "No files" }],
    };

    expect(getMessageFiles(message)).toEqual([]);
  });
});

describe("getMessageReasoningDurationMs", () => {
  it("returns the metadata duration when present", () => {
    const message = {
      id: "13",
      role: "assistant",
      parts: [{ type: "text", text: "Answer" }],
      metadata: { reasoningDurationMs: 1234 },
    } as UIMessage;

    expect(getMessageReasoningDurationMs(message)).toBe(1234);
  });

  it("returns null when metadata is missing", () => {
    const message = {
      id: "14",
      role: "assistant",
      parts: [{ type: "text", text: "Answer" }],
    } as UIMessage;

    expect(getMessageReasoningDurationMs(message)).toBeNull();
  });

  it("returns null for invalid metadata values", () => {
    const message = {
      id: "15",
      role: "assistant",
      parts: [{ type: "text", text: "Answer" }],
      metadata: { reasoningDurationMs: "nope" },
    } as UIMessage;

    expect(getMessageReasoningDurationMs(message)).toBeNull();
  });

  it("returns null for negative or non-finite durations", () => {
    const baseMessage = {
      id: "16",
      role: "assistant",
      parts: [{ type: "text", text: "Answer" }],
    } as UIMessage;

    expect(
      getMessageReasoningDurationMs({
        ...baseMessage,
        metadata: { reasoningDurationMs: -1 },
      })
    ).toBeNull();

    expect(
      getMessageReasoningDurationMs({
        ...baseMessage,
        metadata: { reasoningDurationMs: Number.POSITIVE_INFINITY },
      })
    ).toBeNull();

    expect(
      getMessageReasoningDurationMs({
        ...baseMessage,
        metadata: { reasoningDurationMs: Number.NaN },
      })
    ).toBeNull();
  });
});

describe("getMessageToolParts", () => {
  it("returns tool parts from parts", () => {
    const toolPart = { type: "tool-search", output: { query: "cobuild" } };
    const message = {
      id: "17",
      role: "assistant",
      parts: [toolPart, { type: "text", text: "Content text" }],
    } as UIMessage;

    expect(getMessageToolParts(message)).toEqual([toolPart]);
  });
});

describe("getMessageThoughtParts", () => {
  it("returns reasoning and tool parts", () => {
    const parts = [
      { type: "reasoning", text: "thinking" },
      { type: "tool-search", output: { query: "cobuild" } },
      { type: "text", text: "done" },
    ];
    const message = {
      id: "18",
      role: "assistant",
      parts,
    } as UIMessage;

    expect(getMessageThoughtParts(message)).toEqual([parts[0], parts[1]]);
  });
});

describe("getMessageKey", () => {
  it("prefers message id when present", () => {
    const message: UIMessage = { id: "my-id", role: "assistant", parts: [] };
    expect(getMessageKey(message, 3)).toBe("my-id");
  });

  it("falls back to role and index", () => {
    // @ts-expect-error exercising fallback when id is missing
    const message = { role: "assistant", parts: [] } as UIMessage;
    expect(getMessageKey(message, 2)).toBe("assistant-2");
  });

  it("prefixes chatId when provided", () => {
    const message: UIMessage = { id: "my-id", role: "assistant", parts: [] };
    expect(getMessageKey(message, 3, "chat-1")).toBe("chat-1:my-id");
  });
});

describe("getWebSearchSources", () => {
  const makeToolPart = (output: ToolUIPart["output"]): ToolUIPart => ({
    type: "tool-search",
    toolCallId: "tool-1",
    state: "output-available",
    input: null,
    output,
  });

  it("returns normalized unique http urls", () => {
    const part = makeToolPart({
      sources: [
        { type: "url", url: "https://example.com" },
        { url: "http://example.org" },
        { type: "file", url: "https://ignored.example" },
        { type: "url", url: "ftp://ignored.example" },
        { type: "url", url: "https://example.com" },
        null,
        "nope",
      ],
    });

    expect(getWebSearchSources(part)).toEqual(["https://example.com", "http://example.org"]);
  });

  it("returns empty array for invalid outputs", () => {
    const missingOutput = makeToolPart(undefined);
    const badSources = makeToolPart({ sources: "nope" });

    expect(getWebSearchSources(missingOutput)).toEqual([]);
    expect(getWebSearchSources(badSources)).toEqual([]);
  });
});

describe("isPendingAssistantMessage", () => {
  it("returns true for assistant pending messages", () => {
    const message = {
      id: "a1",
      role: "assistant",
      parts: [],
      metadata: { pending: true },
    } as UIMessage;

    expect(isPendingAssistantMessage(message)).toBe(true);
  });

  it("returns false for non-pending messages", () => {
    const message = {
      id: "u1",
      role: "user",
      parts: [{ type: "text", text: "Hi" }],
    } as UIMessage;

    expect(isPendingAssistantMessage(message)).toBe(false);
  });
});
