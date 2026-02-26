"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { ChatBody } from "@/components/features/chat/chat-client/chat-body";
import { useChatMessageFlow } from "@/components/features/chat/chat-client/hooks/use-chat-message-flow";
import { useChatMessageState } from "@/components/features/chat/chat-client/hooks/use-chat-message-state";
import { useChatSync } from "@/components/features/chat/chat-client/hooks/use-chat-sync";
import { useChatTransport } from "@/components/features/chat/chat-client/hooks/use-chat-transport";
import { useIdentityTokenStorage } from "@/components/features/chat/chat-client/hooks/use-identity-token-storage";
import { ChatThoughtSidebar } from "@/components/features/chat/chat-client/thought-sidebar";
import { useActiveIdentityToken } from "@/lib/domains/auth/use-active-identity-token";
import { useLogin } from "@/lib/domains/auth/use-login";
import { safeSessionStorageGet } from "@/lib/domains/chat/chat-client-utils";
import { DEFAULT_CHAT_TYPE } from "@/lib/domains/chat/constants";
import { primeChatGeo } from "@/lib/domains/chat/geo";
import { writeChatGrant } from "@/lib/domains/chat/grant";
import { getGoalChatPendingKey, parsePendingChatMessage } from "@/lib/domains/chat/pending";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { JsonRecord } from "@/lib/shared/json";

type ChatClientProps = {
  chatId: string;
  identityToken?: string;
  type?: string;
  data?: JsonRecord;
  initialMessages?: UIMessage[];
  initialGrant?: string | null;
  clientDevice?: "mobile" | "desktop";
  showConnectOnUnauthed?: boolean;
};
export function ChatClient({
  chatId,
  identityToken,
  type = DEFAULT_CHAT_TYPE,
  data,
  initialMessages,
  initialGrant,
  clientDevice,
  showConnectOnUnauthed = false,
}: ChatClientProps) {
  const { login } = useLogin();
  const activeIdentityToken = useActiveIdentityToken(identityToken);
  const hasAuth = Boolean(activeIdentityToken);
  const shouldShowConnect = showConnectOnUnauthed && !hasAuth;
  const hasInitialMessages = typeof initialMessages !== "undefined";
  const authExpiredHandlerRef = useRef<() => void>(() => {});
  const [hasPendingOnMount] = useState(() =>
    Boolean(parsePendingChatMessage(safeSessionStorageGet(getGoalChatPendingKey(chatId))))
  );
  useEffect(() => {
    if (initialGrant) {
      writeChatGrant(chatId, initialGrant);
    }
  }, [chatId, initialGrant]);

  useEffect(() => {
    void primeChatGeo();
  }, []);
  useIdentityTokenStorage(activeIdentityToken);

  const handleAuthExpiredRef = useCallback(() => {
    authExpiredHandlerRef.current();
  }, []);

  const { transport, fetchWithGrant, resolveHeaders } = useChatTransport({
    chatId,
    type,
    data,
    clientDevice,
    activeIdentityToken,
    onAuthExpired: handleAuthExpiredRef,
  });

  const {
    messages: chatMessages,
    status: chatStatus,
    error: chatError,
    sendMessage: sendChatMessage,
    setMessages: setChatMessages,
  } = useChat<UIMessage>({ id: chatId, messages: initialMessages, transport });

  const isSubmitted = chatStatus === "submitted";
  const isStreaming = chatStatus === "streaming";
  const isLoading = isSubmitted || isStreaming;

  const {
    visibleMessages,
    lastUserText,
    hasPendingAssistant,
    activeAssistantKey,
    activeThoughtKey,
    activeThoughtMessage,
    showThinking,
    canOpenThinkingThoughts,
    toggleThoughtSidebar,
    closeThoughtSidebar,
  } = useChatMessageState({
    chatId,
    chatMessages,
    isSubmitted,
    isStreaming,
    shouldShowConnect,
  });

  const { inlineError, submit, handleRetry, handleAuthExpired } = useChatMessageFlow({
    chatId,
    hasAuth,
    login,
    sendChatMessage,
    chatStatus,
    chatError,
    lastUserText,
  });

  useEffect(() => {
    authExpiredHandlerRef.current = handleAuthExpired;
  }, [handleAuthExpired]);

  useChatSync({
    chatId,
    hasAuth,
    hasInitialMessages,
    shouldShowConnect,
    hasPendingOnMount,
    chatMessagesLength: chatMessages.length,
    hasPendingAssistant,
    isLoading,
    fetchWithGrant,
    resolveHeaders,
    setChatMessages,
  });

  const inlineErrorState = inlineError
    ? {
        message: inlineError.message,
        canRetry: Boolean(inlineError.retryMessage),
        isSessionError: inlineError.isSessionError,
      }
    : null;
  const chatBody = (
    <ChatBody
      chatId={chatId}
      messages={visibleMessages}
      activeThoughtKey={activeThoughtKey}
      activeAssistantKey={activeAssistantKey}
      showThinking={showThinking}
      canOpenThinkingThoughts={canOpenThinkingThoughts}
      showEmptyState={visibleMessages.length === 0 && !showThinking && !inlineError}
      shouldShowConnect={shouldShowConnect}
      isStreaming={isStreaming}
      isLoading={isLoading}
      inlineError={inlineErrorState}
      onSubmit={submit}
      onConnect={login}
      onRetry={handleRetry}
      onThoughtToggle={toggleThoughtSidebar}
    />
  );

  return (
    <SidebarProvider
      defaultOpen={false}
      storageKey={null}
      enableKeyboardShortcut={false}
      className="h-full min-h-0 w-full"
    >
      <SidebarInset className="min-h-0">{chatBody}</SidebarInset>
      <ChatThoughtSidebar message={activeThoughtMessage} onClose={closeThoughtSidebar} />
    </SidebarProvider>
  );
}
