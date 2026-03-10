/** @vitest-environment happy-dom */
import { renderHook } from "@testing-library/react";
import type { FileUIPart } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";

const {
  defaultChatTransportCtor,
  safeSessionStorageGetMock,
  getMessageFilesMock,
  getMessageTextMock,
} = vi.hoisted(() => ({
  defaultChatTransportCtor: vi.fn(function (this: { options: unknown }, options: unknown) {
    this.options = options;
  }),
  safeSessionStorageGetMock: vi.fn<() => string | null>(() => null),
  getMessageFilesMock: vi.fn<() => FileUIPart[]>(() => []),
  getMessageTextMock: vi.fn(() => ""),
}));

vi.mock("ai", () => ({
  DefaultChatTransport: defaultChatTransportCtor,
}));

vi.mock("@/lib/domains/chat/api", () => ({
  chatApiBase: "https://chat.example.com",
}));

vi.mock("@/lib/domains/chat/geo", () => ({
  getChatGeoHeaders: () => ({}),
}));

vi.mock("@/lib/domains/chat/chat-client-utils", () => ({
  IDENTITY_TOKEN_STORAGE_KEY: "cobuild:privy-id-token",
  safeSessionStorageGet: safeSessionStorageGetMock,
}));

vi.mock("@/lib/domains/chat/messages", () => ({
  getMessageFiles: getMessageFilesMock,
  getMessageText: getMessageTextMock,
}));

import { useChatTransport } from "@/components/features/chat/chat-client/hooks/use-chat-transport";

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function getTransportOptions() {
  expect(defaultChatTransportCtor).toHaveBeenCalledTimes(1);
  return defaultChatTransportCtor.mock.calls[0]?.[0] as {
    body: () => Record<string, unknown>;
    headers: () => Record<string, string>;
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    prepareSendMessagesRequest: (params: {
      body: Record<string, unknown>;
      messages: unknown[];
      trigger?: "submit-message" | "regenerate-message";
      messageId?: string;
    }) => { body: Record<string, unknown> };
  };
}

describe("useChatTransport", () => {
  it("adds trimmed context to the base chat request body", () => {
    renderHook(() =>
      useChatTransport({
        chatId: "chat-1",
        type: "chat-default",
        context: "  project context  ",
        onAuthExpired: vi.fn(),
      })
    );

    const options = getTransportOptions();
    expect(options.body()).toEqual({
      context: "project context",
    });
  });

  it("serializes only the last user turn for POST", () => {
    getMessageTextMock.mockReturnValue("Hello from user");
    getMessageFilesMock.mockReturnValue([
      {
        type: "file",
        url: "https://cdn.example.com/image.png",
        mediaType: "image/png",
      },
    ]);

    renderHook(() =>
      useChatTransport({
        chatId: "chat-1",
        type: "chat-default",
        context: "  project context  ",
        onAuthExpired: vi.fn(),
      })
    );

    const options = getTransportOptions();
    const prepared = options.prepareSendMessagesRequest({
      body: { ...options.body(), clientMessageId: "client-1" },
      messages: [
        { id: "m-old", role: "user", parts: [] },
        { id: "pending-assistant", role: "assistant", parts: [] },
        { id: "client-1", role: "user", parts: [] },
      ],
      trigger: "submit-message",
    });

    expect(prepared.body).toEqual({
      chatId: "chat-1",
      clientMessageId: "client-1",
      userMessage: "Hello from user",
      attachments: [
        {
          type: "file",
          url: "https://cdn.example.com/image.png",
          mediaType: "image/png",
        },
      ],
      context: "project context",
    });
  });

  it("keeps attachment-only submits when text is blank", () => {
    getMessageTextMock.mockReturnValue("");
    getMessageFilesMock.mockReturnValue([
      {
        type: "file",
        url: "https://cdn.example.com/attachment.pdf",
        mediaType: "application/pdf",
        filename: "attachment.pdf",
      },
    ]);

    renderHook(() =>
      useChatTransport({
        chatId: "chat-1",
        type: "chat-default",
        context: "  project context  ",
        onAuthExpired: vi.fn(),
      })
    );

    const options = getTransportOptions();
    const prepared = options.prepareSendMessagesRequest({
      body: options.body(),
      messages: [{ id: "client-2", role: "user", parts: [] }],
      trigger: "submit-message",
    });

    expect(prepared.body).toEqual({
      chatId: "chat-1",
      clientMessageId: "client-2",
      userMessage: "",
      attachments: [
        {
          type: "file",
          url: "https://cdn.example.com/attachment.pdf",
          mediaType: "application/pdf",
          filename: "attachment.pdf",
        },
      ],
      context: "project context",
    });
  });

  it("rejects unsupported regenerate requests", () => {
    getMessageTextMock.mockReturnValue("Hello from user");

    renderHook(() =>
      useChatTransport({
        chatId: "chat-1",
        type: "chat-default",
        onAuthExpired: vi.fn(),
      })
    );

    const options = getTransportOptions();

    expect(() =>
      options.prepareSendMessagesRequest({
        body: {},
        messages: [{ id: "client-1", role: "user", parts: [] }],
        trigger: "regenerate-message",
        messageId: "assistant-1",
      })
    ).toThrow("Unsupported chat transport trigger: regenerate-message (assistant-1)");
  });

  it("omits context when it is blank", () => {
    renderHook(() =>
      useChatTransport({
        chatId: "chat-1",
        type: "chat-default",
        context: "   ",
        onAuthExpired: vi.fn(),
      })
    );

    const options = getTransportOptions();
    expect(options.body()).toEqual({});
  });

  it("adds auth and device headers without grant state", () => {
    safeSessionStorageGetMock.mockReturnValue("token-1");

    renderHook(() =>
      useChatTransport({
        chatId: "chat-1",
        type: "chat-default",
        clientDevice: "mobile",
        onAuthExpired: vi.fn(),
      })
    );

    const options = getTransportOptions();
    expect(options.headers()).toEqual({
      "privy-id-token": "token-1",
      "x-client-device": "mobile",
    });
  });

  it("notifies when auth expires", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 }))
    );
    const onAuthExpired = vi.fn();
    renderHook(() =>
      useChatTransport({
        chatId: "chat-1",
        type: "chat-default",
        onAuthExpired,
      })
    );

    const options = getTransportOptions();
    const response = await options.fetch("https://chat.example.com/api/chat", {
      method: "POST",
    });

    expect(onAuthExpired).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(401);
  });
});
