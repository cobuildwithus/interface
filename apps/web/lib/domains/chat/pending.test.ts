import { afterEach, describe, expect, it, vi } from "vitest";
import type { FileUIPart } from "ai";
import {
  getGoalChatCreateIntentKey,
  getGoalChatIntentKey,
  getGoalChatPendingKey,
  parsePendingChatMessage,
  serializePendingChatMessage,
  storePendingChatMessage,
} from "./pending";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("chat pending key helpers", () => {
  it("builds the intent key with the goal address", () => {
    expect(getGoalChatIntentKey("0xabc")).toBe("goal-chat-intent:0xabc");
  });

  it("builds the create intent key with the goal address", () => {
    expect(getGoalChatCreateIntentKey("0xabc")).toBe("goal-chat-create-intent:0xabc");
  });

  it("builds the pending key with the chat id", () => {
    expect(getGoalChatPendingKey("chat-1")).toBe("goal-chat-pending:chat-1");
  });

  it("serializes and parses pending chat messages", () => {
    const message = {
      text: "hello",
      files: [
        {
          type: "file",
          url: "https://example.com/a.png",
          mediaType: "image/png",
        } as FileUIPart,
      ],
    };

    const serialized = serializePendingChatMessage(message);
    expect(parsePendingChatMessage(serialized)).toEqual(message);
  });

  it("returns null when no pending data exists", () => {
    expect(parsePendingChatMessage(null)).toBeNull();
  });

  it("falls back to plain text for non-json data", () => {
    expect(parsePendingChatMessage("hello")).toEqual({ text: "hello", files: [] });
  });

  it("stores pending messages in session storage when available", () => {
    const sessionStorage = new Map<string, string>();
    // @ts-expect-error minimal window stub for sessionStorage access
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => sessionStorage.get(key) ?? null,
        setItem: (key: string, value: string) => sessionStorage.set(key, value),
      },
    } as Window);

    const message = { text: "hello", files: [] };
    storePendingChatMessage("chat-1", message);

    expect(sessionStorage.get("goal-chat-pending:chat-1")).toBe(
      serializePendingChatMessage(message)
    );
  });

  it("no-ops when window is unavailable", () => {
    vi.stubGlobal("window", undefined);
    expect(() => storePendingChatMessage("chat-1", { text: "hello", files: [] })).not.toThrow();
  });
});
