"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import type { ChatInputMessage } from "@/lib/domains/chat/input-message";
import type { ErrorLike } from "@/lib/shared/errors";
import {
  buildUiMessage,
  getErrorMessage,
  getRetryMessageId,
  normalizeIfHasContent,
  safeSessionStorageGet,
  safeSessionStorageRemove,
  safeSessionStorageSet,
  type PendingChatMessage,
} from "@/lib/domains/chat/chat-client-utils";
import {
  getGoalChatPendingKey,
  parsePendingChatMessage,
  serializePendingChatMessage,
} from "@/lib/domains/chat/pending";

type InlineErrorState = {
  message: string;
  retryMessage?: PendingChatMessage;
  isSessionError?: boolean;
};

type UseChatMessageFlowOptions = {
  chatId: string;
  hasAuth: boolean;
  login: () => void;
  sendChatMessage: UseChatHelpers<UIMessage>["sendMessage"];
  chatStatus: string;
  chatError: Error | string | null | undefined;
  lastUserText: string;
};

export function useChatMessageFlow({
  chatId,
  hasAuth,
  login,
  sendChatMessage,
  chatStatus,
  chatError,
  lastUserText,
}: UseChatMessageFlowOptions) {
  const pendingKey = getGoalChatPendingKey(chatId);
  const authExpiredRef = useRef(false);
  const lastAttemptedMessageRef = useRef<PendingChatMessage | null>(null);
  const pendingMessageRef = useRef<PendingChatMessage | null>(null);
  const [inlineError, setInlineError] = useState<InlineErrorState | null>(null);

  const storePendingMessage = useCallback(
    (message: ChatInputMessage) => {
      const normalized = normalizeIfHasContent(message);
      if (!normalized) return;
      if (normalized.files.length > 0) pendingMessageRef.current = normalized;
      safeSessionStorageSet(pendingKey, serializePendingChatMessage(normalized));
    },
    [pendingKey]
  );

  const sendMessage = useCallback(
    async (
      message: ChatInputMessage | PendingChatMessage,
      options?: { replaceMessageId?: string | null }
    ) => {
      const normalized = normalizeIfHasContent(message);
      if (!normalized) return;

      lastAttemptedMessageRef.current = normalized;
      authExpiredRef.current = false;

      try {
        const replaceMessageId = options?.replaceMessageId ?? null;
        if (replaceMessageId) {
          await sendChatMessage(
            {
              text: normalized.text,
              files: normalized.files,
              messageId: replaceMessageId,
            },
            { body: { clientMessageId: normalized.clientMessageId } }
          );
          return;
        }

        const payload = buildUiMessage(normalized);
        await sendChatMessage(payload, { body: { clientMessageId: normalized.clientMessageId } });
      } catch (error) {
        setInlineError({
          message: getErrorMessage(error as ErrorLike),
          retryMessage: normalized,
        });
      }
    },
    [sendChatMessage]
  );

  const submit = useCallback(
    (message: ChatInputMessage) => {
      setInlineError(null);
      const normalizedMessage = normalizeIfHasContent(message);
      if (!normalizedMessage) return false;
      if (!hasAuth) {
        storePendingMessage(normalizedMessage);
        login();
        return false;
      }

      void sendMessage(normalizedMessage);
      return true;
    },
    [hasAuth, login, sendMessage, storePendingMessage]
  );

  const handleAuthExpired = useCallback(() => {
    if (lastAttemptedMessageRef.current) {
      storePendingMessage(lastAttemptedMessageRef.current);
    }
    authExpiredRef.current = true;
    setInlineError({
      message: "Your session expired. Please reconnect to continue.",
      retryMessage: lastAttemptedMessageRef.current ?? undefined,
      isSessionError: true,
    });
  }, [storePendingMessage]);

  useEffect(() => {
    const pendingMessage = pendingMessageRef.current;
    const pendingStored = parsePendingChatMessage(safeSessionStorageGet(pendingKey));

    if (!hasAuth) {
      if (pendingMessage || pendingStored) {
        login();
      }
      return;
    }

    if (pendingMessage) {
      pendingMessageRef.current = null;
      safeSessionStorageRemove(pendingKey);
      void sendMessage(pendingMessage);
      return;
    }

    if (!pendingStored) return;

    safeSessionStorageRemove(pendingKey);
    void sendMessage(pendingStored);
  }, [hasAuth, login, pendingKey, sendMessage]);

  const handleRetry = useCallback(() => {
    const retryMessage = inlineError?.retryMessage;
    if (!retryMessage) return;
    setInlineError(null);
    const replaceMessageId = getRetryMessageId(retryMessage, lastAttemptedMessageRef.current);
    void sendMessage(retryMessage, { replaceMessageId });
  }, [inlineError, sendMessage]);

  useEffect(() => {
    if (chatStatus !== "error") return;
    if (authExpiredRef.current) return;
    const message = getErrorMessage(chatError);
    const retryMessage =
      lastAttemptedMessageRef.current ??
      (lastUserText ? normalizeIfHasContent({ text: lastUserText, files: [] }) : null);
    const id = requestAnimationFrame(() => {
      setInlineError({ message, retryMessage: retryMessage ?? undefined });
    });
    return () => cancelAnimationFrame(id);
  }, [chatError, chatStatus, lastUserText]);

  return {
    inlineError,
    submit,
    handleRetry,
    handleAuthExpired,
  };
}
