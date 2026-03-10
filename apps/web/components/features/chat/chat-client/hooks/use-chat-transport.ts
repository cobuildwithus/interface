"use client";

import { useCallback, useMemo } from "react";
import { DefaultChatTransport } from "ai";
import { chatApiBase } from "@/lib/domains/chat/api";
import { getChatGeoHeaders } from "@/lib/domains/chat/geo";
import {
  safeSessionStorageGet,
  IDENTITY_TOKEN_STORAGE_KEY,
} from "@/lib/domains/chat/chat-client-utils";
import { getMessageFiles, getMessageText } from "@/lib/domains/chat/messages";
import type { JsonRecord } from "@/lib/shared/json";

type UseChatTransportOptions = {
  chatId: string;
  type: string;
  data?: JsonRecord;
  context?: string;
  clientDevice?: "mobile" | "desktop";
  activeIdentityToken?: string;
  onAuthExpired: () => void;
};

export function useChatTransport({
  chatId,
  context,
  clientDevice,
  activeIdentityToken,
  onAuthExpired,
}: UseChatTransportOptions) {
  const resolveHeaders = useCallback(() => {
    const headers: Record<string, string> = { ...getChatGeoHeaders() };
    const token = activeIdentityToken ?? safeSessionStorageGet(IDENTITY_TOKEN_STORAGE_KEY);
    if (token) {
      headers["privy-id-token"] = token;
    }
    if (clientDevice) {
      headers["x-client-device"] = clientDevice;
    }
    return headers;
  }, [activeIdentityToken, clientDevice]);

  const resolveBody = useCallback(() => {
    const trimmedContext = context?.trim();
    return trimmedContext ? { context: trimmedContext } : {};
  }, [context]);

  const fetchWithAuth = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await fetch(input, init);
      if (response.status === 401) {
        onAuthExpired();
      }
      return response;
    },
    [onAuthExpired]
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${chatApiBase}/api/chat`,
        body: resolveBody,
        headers: resolveHeaders,
        fetch: fetchWithAuth,
        prepareSendMessagesRequest: ({ body = {}, messages, messageId, trigger }) => {
          if (trigger !== "submit-message") {
            throw new Error(
              `Unsupported chat transport trigger: ${trigger} (${messageId ?? "unknown"})`
            );
          }

          const requestBody = body;
          const lastUserMessage = [...messages].reverse().find((message) => {
            return message.role === "user";
          });
          if (!lastUserMessage?.id) {
            throw new Error("No user message available to send.");
          }

          const attachments = getMessageFiles(lastUserMessage);
          const clientMessageId =
            typeof requestBody.clientMessageId === "string" &&
            requestBody.clientMessageId.trim().length > 0
              ? requestBody.clientMessageId.trim()
              : lastUserMessage.id;

          return {
            body: {
              ...requestBody,
              chatId,
              clientMessageId,
              userMessage: getMessageText(lastUserMessage),
              ...(attachments.length > 0 ? { attachments } : {}),
            },
          };
        },
      }),
    [chatId, fetchWithAuth, resolveBody, resolveHeaders]
  );

  return { transport, fetchWithAuth, resolveHeaders };
}
