"use client";

import { useCallback, useMemo } from "react";
import { DefaultChatTransport } from "ai";
import { chatApiBase } from "@/lib/domains/chat/api";
import { getChatGeoHeaders } from "@/lib/domains/chat/geo";
import { CHAT_GRANT_HEADER, readChatGrant, writeChatGrant } from "@/lib/domains/chat/grant";
import {
  safeSessionStorageGet,
  IDENTITY_TOKEN_STORAGE_KEY,
} from "@/lib/domains/chat/chat-client-utils";
import { isPendingAssistantMessage } from "@/lib/domains/chat/messages";
import type { JsonRecord } from "@/lib/shared/json";

type UseChatTransportOptions = {
  chatId: string;
  type: string;
  data?: JsonRecord;
  clientDevice?: "mobile" | "desktop";
  activeIdentityToken?: string;
  onAuthExpired: () => void;
};

export function useChatTransport({
  chatId,
  type,
  data,
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
    const grant = readChatGrant(chatId);
    if (grant) {
      headers[CHAT_GRANT_HEADER] = grant;
    }
    if (clientDevice) {
      headers["x-client-device"] = clientDevice;
    }
    return headers;
  }, [activeIdentityToken, chatId, clientDevice]);

  const resolveBody = useCallback(() => {
    const body = { type, id: chatId };
    return data ? { ...body, data } : body;
  }, [chatId, data, type]);

  const fetchWithGrant = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await fetch(input, init);
      if (response.status === 401) {
        onAuthExpired();
      }
      const refreshedGrant = response.headers.get(CHAT_GRANT_HEADER);
      if (refreshedGrant) {
        writeChatGrant(chatId, refreshedGrant);
      }
      return response;
    },
    [chatId, onAuthExpired]
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${chatApiBase}/api/chat`,
        body: resolveBody,
        headers: resolveHeaders,
        fetch: fetchWithGrant,
        prepareSendMessagesRequest: ({ body, messages, trigger, messageId }) => ({
          body: {
            ...body,
            messages: messages.filter((message) => !isPendingAssistantMessage(message)),
            trigger,
            messageId,
          },
        }),
      }),
    [fetchWithGrant, resolveBody, resolveHeaders]
  );

  return { transport, fetchWithGrant, resolveHeaders };
}
