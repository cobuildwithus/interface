"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatInput } from "@/components/ui/chat-input";
import {
  hasChatInputContent,
  normalizeChatInputMessage,
  type ChatInputMessage,
} from "@/lib/domains/chat/input-message";
import { useActiveIdentityToken } from "@/lib/domains/auth/use-active-identity-token";
import { useLogin } from "@/lib/domains/auth/use-login";
import { writeChatGrant } from "@/lib/domains/chat/grant";
import { primeChatGeo } from "@/lib/domains/chat/geo";
import { createGoalChat, isAuthExpiredStatus } from "@/lib/domains/chat/create-goal-chat";
import {
  consumeGoalChatMessageIntent,
  peekGoalChatMessageIntent,
  setGoalChatMessageIntent,
} from "@/lib/domains/chat/goal-intents";
import { getGoalChatPendingKey, serializePendingChatMessage } from "@/lib/domains/chat/pending";
import { toast } from "sonner";

type GoalAiInputClientProps = {
  goalAddress: string;
  identityToken?: string;
};

export function GoalAiInputClient({ goalAddress, identityToken }: GoalAiInputClientProps) {
  const router = useRouter();
  const { login, authenticated } = useLogin();
  const activeIdentityToken = useActiveIdentityToken(identityToken);
  const [isCreating, setIsCreating] = useState(false);
  const hasAuth = authenticated && Boolean(activeIdentityToken);
  const authRefreshAttempted = useRef(false);
  const lastAuthToken = useRef<string | null>(null);

  useEffect(() => {
    void primeChatGeo();
  }, []);

  const requestLoginWithIntent = useCallback(
    (message: ChatInputMessage) => {
      setGoalChatMessageIntent(goalAddress, message);
      login();
    },
    [goalAddress, login]
  );

  const createChat = useCallback(async () => {
    const fail = (error?: string) => {
      const message = error
        ? `Failed to start a chat: ${error}`
        : "Failed to start a chat. Please try again.";
      toast.error(message);
      return null;
    };

    const result = await createGoalChat({ goalAddress, identityToken: activeIdentityToken });
    if (!result.ok) {
      if (isAuthExpiredStatus(result.status)) {
        return "auth_expired";
      }
      return fail(result.error);
    }

    if (result.data.chatGrant) {
      writeChatGrant(result.data.chatId, result.data.chatGrant);
    }

    return result.data.chatId;
  }, [activeIdentityToken, goalAddress]);

  const handleSubmit = useCallback(
    async ({ text, files }: ChatInputMessage) => {
      const message = normalizeChatInputMessage({ text, files });
      if (!hasChatInputContent(message)) return false;
      if (!hasAuth) {
        authRefreshAttempted.current = false;
        requestLoginWithIntent(message);
        return false;
      }

      setIsCreating(true);
      const chatId = await createChat();
      setIsCreating(false);
      if (chatId === "auth_expired") {
        if (!authRefreshAttempted.current) {
          authRefreshAttempted.current = true;
          lastAuthToken.current = activeIdentityToken ?? null;
          requestLoginWithIntent(message);
          return false;
        }
        toast.error("Chat auth failed. Please reconnect and try again.");
        return false;
      }
      if (!chatId) return false;

      const pendingKey = getGoalChatPendingKey(chatId);
      sessionStorage.setItem(pendingKey, serializePendingChatMessage(message));
      router.push(`/${goalAddress}/c/${chatId}`);
      return true;
    },
    [activeIdentityToken, createChat, goalAddress, hasAuth, requestLoginWithIntent, router]
  );

  useEffect(() => {
    if (!hasAuth || isCreating) return;
    const pending = peekGoalChatMessageIntent(goalAddress);
    if (!pending) return;
    if (authRefreshAttempted.current && activeIdentityToken === lastAuthToken.current) {
      return;
    }
    const consumed = consumeGoalChatMessageIntent(goalAddress);
    if (!consumed) return;
    authRefreshAttempted.current = false;
    lastAuthToken.current = activeIdentityToken ?? null;
    const id = requestAnimationFrame(() => void handleSubmit(consumed));
    return () => cancelAnimationFrame(id);
  }, [activeIdentityToken, goalAddress, handleSubmit, hasAuth, isCreating]);

  return (
    <ChatInput
      onSubmit={handleSubmit}
      autoFocus
      isLoading={isCreating}
      globalDrop
      maxAttachments={2}
    />
  );
}
