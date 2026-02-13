"use client";

import type { UIMessage } from "ai";
import { useCallback, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ChatMessageList } from "@/components/features/chat/chat-client/message-list";
import { ChatThoughtDisclosure } from "@/components/features/chat/chat-client/thought-disclosure";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ui/chat-input";
import { createClientMessageId } from "@/lib/domains/chat/chat-client-utils";
import type { ChatInputMessage } from "@/lib/domains/chat/input-message";
import type { ReplyContextItem } from "@/lib/domains/chat/reply-context";

type InlineErrorState = {
  message: string;
  canRetry: boolean;
  isSessionError?: boolean;
};

type ChatBodyProps = {
  chatId: string;
  messages: UIMessage[];
  activeThoughtKey: string | null;
  activeAssistantKey: string | null;
  showThinking: boolean;
  canOpenThinkingThoughts: boolean;
  showEmptyState: boolean;
  shouldShowConnect: boolean;
  isStreaming: boolean;
  isLoading: boolean;
  inlineError: InlineErrorState | null;
  onSubmit: (message: ChatInputMessage) => boolean;
  onConnect: () => void;
  onRetry: () => void;
  onThoughtToggle: (messageKey: string) => void;
};

const InlineErrorMessage = ({
  message,
  onRetry,
  onConnect,
  disableRetry,
  isSessionError,
}: {
  message: string;
  onRetry: () => void;
  onConnect: () => void;
  disableRetry: boolean;
  isSessionError?: boolean;
}) => (
  <Message from="assistant">
    <MessageContent className="text-foreground text-base leading-normal">
      <div className="bg-card/50 border-border/50 rounded-xl border px-5 py-4">
        <div className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
          {isSessionError ? "Session expired" : "Something went wrong"}
        </div>
        <p className="text-foreground/90 text-sm">{message}</p>
        <div className="mt-4 flex items-center gap-2">
          {isSessionError ? (
            <Button type="button" size="sm" onClick={onConnect}>
              Connect
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onRetry}
              disabled={disableRetry}
            >
              Try again
            </Button>
          )}
        </div>
      </div>
    </MessageContent>
  </Message>
);

export function ChatBody({
  chatId,
  messages,
  activeThoughtKey,
  activeAssistantKey,
  showThinking,
  canOpenThinkingThoughts,
  showEmptyState,
  shouldShowConnect,
  isStreaming,
  isLoading,
  inlineError,
  onSubmit,
  onConnect,
  onRetry,
  onThoughtToggle,
}: ChatBodyProps) {
  const [replyContext, setReplyContext] = useState<ReplyContextItem[]>([]);

  const handleAddReplyContext = useCallback((payload: Omit<ReplyContextItem, "id">) => {
    const text = payload.text.trim();
    if (!text) return;
    const id = createClientMessageId();
    setReplyContext((current) => {
      const existingIndex = current.findIndex(
        (item) => item.messageKey === payload.messageKey && item.text === text
      );
      const without =
        existingIndex >= 0 ? current.filter((_, index) => index !== existingIndex) : current;
      const next = [...without, { ...payload, id, text }];
      return next.slice(-5);
    });
  }, []);

  const handleRemoveReplyContext = useCallback((id: string) => {
    setReplyContext((current) => current.filter((item) => item.id !== id));
  }, []);

  const handleClearReplyContext = useCallback(() => {
    setReplyContext([]);
  }, []);

  const emptyState = shouldShowConnect ? (
    <ConversationEmptyState>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Connect to view this chat</h3>
          <p className="text-muted-foreground text-sm">
            Connect your wallet to load this conversation.
          </p>
        </div>
        <Button type="button" onClick={onConnect}>
          Connect
        </Button>
      </div>
    </ConversationEmptyState>
  ) : (
    <ConversationEmptyState />
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="relative min-h-0 flex-1">
        <Conversation className="absolute inset-0 w-full">
          <ConversationContent className="font-content mx-auto w-full max-w-[768px] px-4 pb-28 sm:px-6">
            {showEmptyState ? (
              emptyState
            ) : (
              <ChatMessageList
                messages={messages}
                chatId={chatId}
                activeThoughtKey={activeThoughtKey}
                onQuoteSelection={handleAddReplyContext}
                onThoughtToggle={onThoughtToggle}
                suppressThoughtKey={showThinking ? activeAssistantKey : null}
                streamingAssistantKey={isStreaming ? activeAssistantKey : null}
              />
            )}
            {inlineError ? (
              <InlineErrorMessage
                message={inlineError.message}
                onRetry={onRetry}
                onConnect={onConnect}
                disableRetry={!inlineError.canRetry || isLoading}
                isSessionError={inlineError.isSessionError}
              />
            ) : null}
            {showThinking && (
              <Message from="assistant">
                <MessageContent className="text-muted-foreground text-base leading-normal">
                  <div className="flex items-center gap-2 text-base">
                    {canOpenThinkingThoughts && activeAssistantKey ? (
                      <ChatThoughtDisclosure
                        label={<Shimmer duration={2}>Thinking</Shimmer>}
                        isOpen={activeThoughtKey === activeAssistantKey}
                        onToggle={() => {
                          onThoughtToggle(activeAssistantKey);
                        }}
                      />
                    ) : (
                      <Shimmer duration={2}>Thinking</Shimmer>
                    )}
                  </div>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      {!shouldShowConnect && (
        <div className="sticky bottom-6 z-10 shrink-0">
          <div className="mx-auto w-full max-w-[768px]">
            <ChatInput
              onSubmit={onSubmit}
              isLoading={isLoading}
              autoFocus
              globalDrop
              maxAttachments={2}
              className="font-content"
              inputClassName="text-base leading-relaxed"
              replyContext={replyContext}
              onRemoveReplyContext={handleRemoveReplyContext}
              onClearReplyContext={handleClearReplyContext}
            />
          </div>
        </div>
      )}
    </div>
  );
}
