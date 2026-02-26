"use client";

import { useState } from "react";
import type { UIMessage } from "ai";
import { buildChatMessageState, shouldShowThinking } from "@/lib/domains/chat/chat-client-helpers";
import { getMessageKey, getMessageThoughtParts } from "@/lib/domains/chat/messages";

type UseChatMessageStateOptions = {
  chatId: string;
  chatMessages: UIMessage[];
  isSubmitted: boolean;
  isStreaming: boolean;
  shouldShowConnect: boolean;
};

export function useChatMessageState({
  chatId,
  chatMessages,
  isSubmitted,
  isStreaming,
  shouldShowConnect,
}: UseChatMessageStateOptions) {
  const {
    visibleMessages,
    activeAssistantIndex,
    activeAssistantMessage,
    activeAssistantText,
    lastUserText,
    hasPendingAssistant,
  } = buildChatMessageState(chatMessages);
  const [activeThoughtKey, setActiveThoughtKey] = useState<string | null>(null);

  const activeAssistantKey =
    activeAssistantIndex >= 0
      ? getMessageKey(visibleMessages[activeAssistantIndex], activeAssistantIndex, chatId)
      : null;

  const activeThoughtMessage = activeThoughtKey
    ? (visibleMessages.find(
        (message, index) => getMessageKey(message, index, chatId) === activeThoughtKey
      ) ?? null)
    : null;

  const activeAssistantHasThoughts = activeAssistantMessage
    ? getMessageThoughtParts(activeAssistantMessage).length > 0
    : false;
  const showThinking = shouldShowThinking({
    shouldShowConnect,
    hasPendingAssistant,
    isSubmitted,
    isStreaming,
    activeAssistantText,
  });
  const canOpenThinkingThoughts =
    showThinking && activeAssistantHasThoughts && !!activeAssistantKey;

  const toggleThoughtSidebar = (messageKey: string) => {
    setActiveThoughtKey((current) => (current === messageKey ? null : messageKey));
  };

  const closeThoughtSidebar = () => {
    setActiveThoughtKey(null);
  };

  return {
    visibleMessages,
    lastUserText,
    hasPendingAssistant,
    activeAssistantKey,
    activeThoughtKey: activeThoughtMessage ? activeThoughtKey : null,
    activeThoughtMessage,
    showThinking,
    canOpenThinkingThoughts,
    toggleThoughtSidebar,
    closeThoughtSidebar,
  };
}
