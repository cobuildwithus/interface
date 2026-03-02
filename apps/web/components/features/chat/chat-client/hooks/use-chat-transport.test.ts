/** @vitest-environment happy-dom */
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const {
  defaultChatTransportCtor,
  readChatGrantMock,
  writeChatGrantMock,
  safeSessionStorageGetMock,
  isPendingAssistantMessageMock,
} = vi.hoisted(() => ({
  defaultChatTransportCtor: vi.fn(function (this: { options: unknown }, options: unknown) {
    this.options = options;
  }),
  readChatGrantMock: vi.fn(() => null),
  writeChatGrantMock: vi.fn(),
  safeSessionStorageGetMock: vi.fn(() => null),
  isPendingAssistantMessageMock: vi.fn(() => false),
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

vi.mock("@/lib/domains/chat/grant", () => ({
  CHAT_GRANT_HEADER: "x-chat-grant",
  readChatGrant: readChatGrantMock,
  writeChatGrant: writeChatGrantMock,
}));

vi.mock("@/lib/domains/chat/chat-client-utils", () => ({
  IDENTITY_TOKEN_STORAGE_KEY: "cobuild:privy-id-token",
  safeSessionStorageGet: safeSessionStorageGetMock,
}));

vi.mock("@/lib/domains/chat/messages", () => ({
  isPendingAssistantMessage: isPendingAssistantMessageMock,
}));

import { useChatTransport } from "@/components/features/chat/chat-client/hooks/use-chat-transport";

afterEach(() => {
  vi.clearAllMocks();
});

function getTransportOptions() {
  expect(defaultChatTransportCtor).toHaveBeenCalledTimes(1);
  return defaultChatTransportCtor.mock.calls[0]?.[0] as {
    body: () => Record<string, unknown>;
    prepareSendMessagesRequest: (params: {
      body: Record<string, unknown>;
      messages: unknown[];
      trigger: string | undefined;
      messageId: string | undefined;
    }) => { body: Record<string, unknown> };
  };
}

describe("useChatTransport", () => {
  it("adds trimmed context to outbound chat request body", () => {
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
      type: "chat-default",
      id: "chat-1",
      context: "project context",
    });

    const prepared = options.prepareSendMessagesRequest({
      body: options.body(),
      messages: [{ id: "m1", role: "user", parts: [] }],
      trigger: "submit-message",
      messageId: "m1",
    });
    expect(prepared.body.context).toBe("project context");
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
    expect(options.body()).toEqual({
      type: "chat-default",
      id: "chat-1",
    });
  });
});
