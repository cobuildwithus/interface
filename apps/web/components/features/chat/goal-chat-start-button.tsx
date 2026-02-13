"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthButton } from "@/components/ui/auth-button";
import { useActiveIdentityToken } from "@/lib/domains/auth/use-active-identity-token";
import { useLogin } from "@/lib/domains/auth/use-login";
import { createGoalChat, isAuthExpiredStatus } from "@/lib/domains/chat/create-goal-chat";
import {
  consumeGoalChatCreateConfig,
  consumeGoalChatCreateIntent,
  setGoalChatCreateConfig,
  setGoalChatCreateIntent,
  type GoalChatCreateConfig,
} from "@/lib/domains/chat/goal-intents";
import {
  hasChatInputContent,
  normalizeChatInputMessage,
  type ChatInputMessage,
} from "@/lib/domains/chat/input-message";
import { storePendingChatMessage } from "@/lib/domains/chat/pending";
import { primeChatGeo } from "@/lib/domains/chat/geo";
import { writeChatGrant } from "@/lib/domains/chat/grant";
import type { JsonRecord } from "@/lib/shared/json";

type AuthButtonProps = ComponentProps<typeof AuthButton>;

type GoalChatStartButtonProps = Omit<AuthButtonProps, "onClick" | "onConnect"> & {
  goalAddress: string;
  chatData?: JsonRecord;
  initialMessage?: string | ChatInputMessage;
};

const normalizeInitialMessage = (message?: string | ChatInputMessage) => {
  if (!message) return null;
  const normalized =
    typeof message === "string"
      ? normalizeChatInputMessage({ text: message, files: [] })
      : normalizeChatInputMessage(message);
  return hasChatInputContent(normalized) ? normalized : null;
};

export function GoalChatStartButton({
  goalAddress,
  chatData,
  initialMessage,
  disabled,
  children,
  ...rest
}: GoalChatStartButtonProps) {
  const router = useRouter();
  const { login } = useLogin();
  const activeIdentityToken = useActiveIdentityToken();
  const [isCreating, setIsCreating] = useState(false);
  const hasAuth = Boolean(activeIdentityToken);
  const authRefreshAttempted = useRef(false);

  useEffect(() => {
    void primeChatGeo();
  }, []);

  const normalizedMessage = useMemo(
    () => normalizeInitialMessage(initialMessage),
    [initialMessage]
  );

  const createConfig = useMemo<GoalChatCreateConfig>(
    () => ({
      data: chatData,
      ...(normalizedMessage ? { message: normalizedMessage } : {}),
    }),
    [chatData, normalizedMessage]
  );

  const setCreateIntentWithConfig = useCallback(
    (config: GoalChatCreateConfig) => {
      setGoalChatCreateIntent(goalAddress);
      setGoalChatCreateConfig(goalAddress, config);
    },
    [goalAddress]
  );

  const createChat = useCallback(
    async (config?: GoalChatCreateConfig | null) => {
      const fail = (error?: string) => {
        const message = error
          ? `Failed to start a chat: ${error}`
          : "Failed to start a chat. Please try again.";
        toast.error(message);
        return null;
      };

      const result = await createGoalChat({
        goalAddress,
        identityToken: activeIdentityToken ?? undefined,
        data: config?.data,
      });
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
    },
    [activeIdentityToken, goalAddress]
  );

  const createAndNavigate = useCallback(
    async (config?: GoalChatCreateConfig | null) => {
      const resolvedConfig = config ?? createConfig;
      setIsCreating(true);
      const chatId = await createChat(resolvedConfig);
      setIsCreating(false);
      if (chatId === "auth_expired") {
        if (hasAuth) {
          if (!authRefreshAttempted.current) {
            authRefreshAttempted.current = true;
            setCreateIntentWithConfig(resolvedConfig);
            login();
            return;
          }
          toast.error("Chat auth failed. Please refresh and try again.");
          return;
        }
        setCreateIntentWithConfig(resolvedConfig);
        login();
        return;
      }
      if (!chatId) return;
      if (resolvedConfig.message && hasChatInputContent(resolvedConfig.message)) {
        storePendingChatMessage(chatId, resolvedConfig.message);
      }
      router.push(`/${goalAddress}/c/${chatId}`);
    },
    [createChat, createConfig, goalAddress, hasAuth, login, router, setCreateIntentWithConfig]
  );

  const handleCreateClick = useCallback(() => {
    authRefreshAttempted.current = false;
    void createAndNavigate();
  }, [createAndNavigate]);

  useEffect(() => {
    if (!hasAuth || isCreating) return;
    if (!consumeGoalChatCreateIntent(goalAddress)) return;
    const config = consumeGoalChatCreateConfig(goalAddress);
    const id = requestAnimationFrame(() => void createAndNavigate(config));
    return () => cancelAnimationFrame(id);
  }, [createAndNavigate, goalAddress, hasAuth, isCreating]);

  return (
    <AuthButton
      onClick={handleCreateClick}
      onConnect={() => setCreateIntentWithConfig(createConfig)}
      disabled={disabled || isCreating}
      aria-busy={isCreating}
      {...rest}
    >
      {children}
    </AuthButton>
  );
}
