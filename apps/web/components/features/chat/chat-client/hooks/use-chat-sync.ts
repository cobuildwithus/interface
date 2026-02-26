"use client";

import { useCallback, useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { chatApiBase } from "@/lib/domains/chat/api";
import { CHAT_POLL_INTERVAL_MS } from "@/lib/domains/chat/constants";

type UseChatSyncOptions = {
  chatId: string;
  hasAuth: boolean;
  hasInitialMessages: boolean;
  shouldShowConnect: boolean;
  hasPendingOnMount: boolean;
  chatMessagesLength: number;
  hasPendingAssistant: boolean;
  isLoading: boolean;
  fetchWithGrant: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  resolveHeaders: () => Record<string, string>;
  setChatMessages: (messages: UIMessage[]) => void;
};

export function useChatSync({
  chatId,
  hasAuth,
  hasInitialMessages,
  shouldShowConnect,
  hasPendingOnMount,
  chatMessagesLength,
  hasPendingAssistant,
  isLoading,
  fetchWithGrant,
  resolveHeaders,
  setChatMessages,
}: UseChatSyncOptions) {
  const didInitialFetchRef = useRef(false);

  const refreshChatMessages = useCallback(async () => {
    const response = await fetchWithGrant(`${chatApiBase}/api/chat/${chatId}`, {
      headers: resolveHeaders(),
    });
    if (!response.ok) return;
    const payload = (await response.json().catch(() => null)) as {
      messages?: UIMessage[];
    } | null;
    const messages = Array.isArray(payload?.messages) ? payload.messages : null;
    if (!messages) return;
    if (messages.length === 0 && chatMessagesLength > 0) return;
    setChatMessages(messages);
  }, [chatId, chatMessagesLength, fetchWithGrant, resolveHeaders, setChatMessages]);

  useEffect(() => {
    if (didInitialFetchRef.current || hasInitialMessages) return;
    if (!hasAuth || shouldShowConnect || chatMessagesLength > 0) return;
    if (hasPendingOnMount) return;
    didInitialFetchRef.current = true;
    void refreshChatMessages();
  }, [
    chatMessagesLength,
    hasAuth,
    hasInitialMessages,
    hasPendingOnMount,
    refreshChatMessages,
    shouldShowConnect,
  ]);

  useEffect(() => {
    if (!hasPendingAssistant || isLoading || shouldShowConnect) return;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      await refreshChatMessages();
    };
    void poll();
    const interval = window.setInterval(poll, CHAT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [hasPendingAssistant, isLoading, refreshChatMessages, shouldShowConnect]);
}
