/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FileUIPart } from "ai";
import {
  buildUiMessage,
  createClientMessageId,
  getErrorMessage,
  getRetryMessageId,
  normalizeIfHasContent,
  safeSessionStorageGet,
  safeSessionStorageRemove,
  safeSessionStorageSet,
  type PendingChatMessage,
} from "@/lib/domains/chat/chat-client-utils";

const createFilePart = (): FileUIPart =>
  ({
    type: "file",
    mediaType: "image",
    mimeType: "image/png",
    url: "https://example.com/file.png",
    name: "file.png",
  }) as FileUIPart;

describe("getErrorMessage", () => {
  it("returns the message from Error", () => {
    expect(getErrorMessage(new Error("Boom"))).toBe("Boom");
  });

  it("falls back when Error has no message", () => {
    expect(getErrorMessage(new Error(""))).toBe("Chat failed to send. Please try again.");
  });

  it("returns trimmed string errors", () => {
    expect(getErrorMessage("  Not great ")).toBe("Not great");
  });

  it("falls back for empty string errors", () => {
    expect(getErrorMessage("   ")).toBe("Chat failed to send. Please try again.");
  });

  it("falls back to a default message", () => {
    expect(getErrorMessage({})).toBe("Chat failed to send. Please try again.");
  });
});

describe("createClientMessageId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses crypto.randomUUID when available", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-123" } as Crypto);
    expect(createClientMessageId()).toBe("uuid-123");
  });

  it("falls back when crypto is unavailable", () => {
    vi.stubGlobal("crypto", undefined);
    const id = createClientMessageId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("falls back when randomUUID is missing", () => {
    vi.stubGlobal("crypto", {} as Crypto);
    const id = createClientMessageId();
    expect(typeof id).toBe("string");
    expect(id.includes("-")).toBe(true);
  });
});

describe("normalizeIfHasContent", () => {
  it("returns null when there is no content", () => {
    expect(normalizeIfHasContent({ text: " ", files: [] })).toBeNull();
  });

  it("normalizes text and assigns a client id", () => {
    const result = normalizeIfHasContent({ text: " Hello ", files: [] });
    expect(result?.text).toBe("Hello");
    expect(result?.clientMessageId).toBeTruthy();
  });

  it("preserves the client id when provided", () => {
    const message = {
      text: "Hi",
      files: [],
      clientMessageId: "existing-id",
    } as PendingChatMessage;
    expect(normalizeIfHasContent(message)?.clientMessageId).toBe("existing-id");
  });

  it("accepts file-only messages", () => {
    const result = normalizeIfHasContent({ text: " ", files: [createFilePart()] });
    expect(result).not.toBeNull();
    expect(result?.files.length).toBe(1);
  });
});

describe("buildUiMessage", () => {
  it("builds a user message with text parts", () => {
    const pending: PendingChatMessage = {
      text: "Hello",
      files: [],
      clientMessageId: "msg-1",
    };
    const uiMessage = buildUiMessage(pending);
    expect(uiMessage.id).toBe("msg-1");
    expect(uiMessage.role).toBe("user");
    expect(uiMessage.parts).toHaveLength(1);
    expect(uiMessage.parts[0]).toMatchObject({ type: "text", text: "Hello" });
  });

  it("includes file parts when provided", () => {
    const filePart = createFilePart();
    const pending: PendingChatMessage = {
      text: "",
      files: [filePart],
      clientMessageId: "msg-2",
    };
    const uiMessage = buildUiMessage(pending);
    expect(uiMessage.parts).toHaveLength(1);
    expect(uiMessage.parts[0]).toBe(filePart);
  });
});

describe("getRetryMessageId", () => {
  it("returns the retry message id when it matches the last attempted message", () => {
    const message: PendingChatMessage = {
      text: "Hello",
      files: [],
      clientMessageId: "msg-1",
    };
    expect(getRetryMessageId(message, message)).toBe("msg-1");
  });

  it("returns null when the retry message does not match the last attempted message", () => {
    const retry: PendingChatMessage = {
      text: "Retry",
      files: [],
      clientMessageId: "retry-1",
    };
    const lastAttempted: PendingChatMessage = {
      text: "Original",
      files: [],
      clientMessageId: "orig-1",
    };
    expect(getRetryMessageId(retry, lastAttempted)).toBeNull();
  });

  it("returns null when there is no last attempted message", () => {
    const retry: PendingChatMessage = {
      text: "Retry",
      files: [],
      clientMessageId: "retry-1",
    };
    expect(getRetryMessageId(retry, null)).toBeNull();
  });
});

describe("safeSessionStorage helpers", () => {
  it("stores and removes values", () => {
    const key = "chat:storage-test";
    safeSessionStorageSet(key, "value");
    expect(safeSessionStorageGet(key)).toBe("value");
    safeSessionStorageRemove(key);
    expect(safeSessionStorageGet(key)).toBeNull();
  });

  it("returns null for missing keys", () => {
    expect(safeSessionStorageGet("chat:missing")).toBeNull();
  });

  it("returns null when window is unavailable", () => {
    vi.stubGlobal("window", undefined);
    expect(safeSessionStorageGet("chat:missing")).toBeNull();
    safeSessionStorageSet("chat:missing", "value");
    safeSessionStorageRemove("chat:missing");
    vi.unstubAllGlobals();
  });

  it("swallows storage errors", () => {
    const getSpy = vi.spyOn(window.sessionStorage, "getItem").mockImplementation(() => {
      throw new Error("fail");
    });
    const setSpy = vi.spyOn(window.sessionStorage, "setItem").mockImplementation(() => {
      throw new Error("fail");
    });
    const removeSpy = vi.spyOn(window.sessionStorage, "removeItem").mockImplementation(() => {
      throw new Error("fail");
    });

    expect(safeSessionStorageGet("chat:error")).toBeNull();
    expect(() => safeSessionStorageSet("chat:error", "value")).not.toThrow();
    expect(() => safeSessionStorageRemove("chat:error")).not.toThrow();

    getSpy.mockRestore();
    setSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
