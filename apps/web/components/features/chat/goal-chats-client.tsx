"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, MessageSquare, ChevronRight } from "lucide-react";
import { DateTime } from "@/components/ui/date-time";
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
import { hasChatInputContent } from "@/lib/domains/chat/input-message";
import { storePendingChatMessage } from "@/lib/domains/chat/pending";
import { writeChatGrant } from "@/lib/domains/chat/grant";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/shared/utils";
import type { ChatListItem } from "@/lib/domains/chat/types";

type GoalChatsClientProps = {
  goalAddress: string;
  identityToken?: string;
  chats: ChatListItem[];
};

export function GoalChatsClient({ goalAddress, identityToken, chats }: GoalChatsClientProps) {
  const router = useRouter();
  const { login } = useLogin();
  const activeIdentityToken = useActiveIdentityToken(identityToken);
  const [isCreating, setIsCreating] = useState(false);
  const hasAuth = Boolean(activeIdentityToken);
  const authRefreshAttempted = useRef(false);

  const setCreateIntent = useCallback(() => {
    setGoalChatCreateIntent(goalAddress);
  }, [goalAddress]);

  const setCreateIntentWithConfig = useCallback(
    (config: GoalChatCreateConfig) => {
      setGoalChatCreateIntent(goalAddress);
      setGoalChatCreateConfig(goalAddress, config);
    },
    [goalAddress]
  );

  const requestLoginWithIntent = useCallback(() => {
    setCreateIntent();
    login();
  }, [login, setCreateIntent]);

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
        identityToken: activeIdentityToken,
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
      setIsCreating(true);
      const chatId = await createChat(config ?? undefined);
      setIsCreating(false);
      if (chatId === "auth_expired") {
        if (hasAuth) {
          if (!authRefreshAttempted.current) {
            authRefreshAttempted.current = true;
            if (config) {
              setCreateIntentWithConfig(config);
            } else {
              requestLoginWithIntent();
            }
            return;
          }
          toast.error("Chat auth failed. Please refresh and try again.");
          return;
        }
        if (config) {
          setCreateIntentWithConfig(config);
          login();
        } else {
          requestLoginWithIntent();
        }
        return;
      }
      if (!chatId) return;
      if (config?.message && hasChatInputContent(config.message)) {
        storePendingChatMessage(chatId, config.message);
      }
      router.push(`/${goalAddress}/c/${chatId}`);
    },
    [
      createChat,
      goalAddress,
      hasAuth,
      login,
      requestLoginWithIntent,
      router,
      setCreateIntentWithConfig,
    ]
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

  const buttonLabel = isCreating ? "Creating..." : "New chat";
  const renderIconCreateButton = () => (
    <AuthButton
      onClick={handleCreateClick}
      onConnect={setCreateIntent}
      connectLabel={<Plus className="size-4" />}
      disabled={isCreating}
      variant="outline"
      size="icon"
      aria-label={buttonLabel}
      title={buttonLabel}
    >
      <Plus className="size-4" />
    </AuthButton>
  );
  const renderCreateButton = (size?: "default" | "sm") => (
    <AuthButton
      onClick={handleCreateClick}
      onConnect={setCreateIntent}
      connectLabel="Connect to start"
      disabled={isCreating}
      size={size}
    >
      {buttonLabel}
    </AuthButton>
  );

  return (
    <section>
      <PageHeader title="Chats" description="Keep track of conversations about this goal.">
        <div className="self-end">{renderIconCreateButton()}</div>
      </PageHeader>

      {chats.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <div className="bg-muted mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full">
            <MessageSquare className="text-muted-foreground h-5 w-5" />
          </div>
          <p className="font-medium">No chats yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Start the first conversation for this goal.
          </p>
          <div className="mt-4">{renderCreateButton("sm")}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {chats.map((chat) => {
            const updatedAt = new Date(chat.updatedAt);
            return (
              <Link
                key={chat.id}
                href={`/${goalAddress}/c/${chat.id}`}
                className={cn(
                  "border-border/50 bg-card group flex items-center gap-3 rounded-lg border px-3 py-3",
                  "hover:bg-muted/50 transition-colors"
                )}
              >
                <div className="bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{chat.title || "New chat"}</p>
                  <p className="text-muted-foreground text-xs">
                    <DateTime date={updatedAt} relative short />
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground/50 group-hover:text-muted-foreground h-4 w-4 shrink-0 transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
