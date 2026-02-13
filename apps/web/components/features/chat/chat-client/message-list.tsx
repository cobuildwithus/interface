"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { Check, Copy } from "lucide-react";
import {
  Message,
  MessageAttachment,
  MessageAttachments,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { ChatThoughtDisclosure } from "@/components/features/chat/chat-client/thought-disclosure";
import { SelectionReplyButton } from "@/components/features/chat/chat-client/selection-reply-button";
import { useSelectionReply } from "@/components/features/chat/chat-client/hooks/use-selection-reply";
import {
  getMessageFiles,
  getMessageKey,
  getMessageReasoning,
  getMessageReasoningDurationMs,
  getMessageText,
  getMessageToolParts,
} from "@/lib/domains/chat/messages";
import { formatThoughtLabel } from "@/lib/domains/chat/chat-client-helpers";
import type { ReplyContextItem } from "@/lib/domains/chat/reply-context";

type ChatMessageListProps = {
  messages: UIMessage[];
  chatId: string;
  activeThoughtKey: string | null;
  suppressThoughtKey?: string | null;
  streamingAssistantKey?: string | null;
  onThoughtToggle: (messageKey: string) => void;
  onQuoteSelection: (payload: Omit<ReplyContextItem, "id">) => void;
};

const COPY_RESET_MS = 1500;

const copyToClipboard = async (value: string) => {
  if (!value) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
};

const CopyMessageButton = ({ text, align }: { text: string; align: "left" | "right" }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), COPY_RESET_MS);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const handleCopy = useCallback(async () => {
    const didCopy = await copyToClipboard(text);
    if (didCopy) setCopied(true);
  }, [text]);

  return (
    <MessageActions
      className={`mt-0.5 w-full ${align === "right" ? "justify-end" : "justify-start"}`}
    >
      <MessageAction
        onClick={handleCopy}
        tooltip={copied ? "Copied" : "Copy"}
        label={copied ? "Copied" : "Copy"}
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-foreground h-7 w-7 transition"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </MessageAction>
    </MessageActions>
  );
};

export function ChatMessageList({
  messages,
  chatId,
  activeThoughtKey,
  suppressThoughtKey = null,
  streamingAssistantKey = null,
  onThoughtToggle,
  onQuoteSelection,
}: ChatMessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const { selectionPosition, hasSelection, handleReply } = useSelectionReply({
    containerRef: listRef,
    onQuoteSelection,
  });

  const nodes = messages.map((message, index) => {
    const messageKey = getMessageKey(message, index, chatId);
    const text = getMessageText(message);
    const files = getMessageFiles(message);
    const toolParts = getMessageToolParts(message);
    const isAssistant = message.role === "assistant";
    const hasText = text.length > 0;
    const hasFiles = files.length > 0;
    const hasTools = toolParts.length > 0;
    const reasoning = isAssistant ? getMessageReasoning(message).trim() : "";
    const hasReasoning = reasoning.length > 0;
    if (!hasText && !hasFiles && !hasTools && !hasReasoning) return null;

    const reasoningDurationMs = isAssistant ? getMessageReasoningDurationMs(message) : null;
    const shouldSuppressThought = suppressThoughtKey === messageKey && !hasText;
    const shouldRenderThoughtDisclosure =
      !shouldSuppressThought && isAssistant && (hasReasoning || hasTools);
    const thoughtLabel =
      formatThoughtLabel(reasoningDurationMs) || (shouldRenderThoughtDisclosure ? "Thought" : "");
    const shouldRenderContent = hasText || shouldRenderThoughtDisclosure;
    const contentClassName =
      shouldRenderThoughtDisclosure && hasTools
        ? "text-base leading-normal w-full"
        : "text-base leading-normal";
    const copyText = [text, ...files.map((file) => file.url)].filter(Boolean).join("\n");
    const isStreamingAssistantMessage = isAssistant && streamingAssistantKey === messageKey;
    const shouldRenderCopyButton = copyText.length > 0 && !isStreamingAssistantMessage;
    const copyAlign = isAssistant ? "left" : "right";
    if (!shouldRenderContent && !hasFiles) return null;

    return (
      <Message key={messageKey} from={message.role} data-message-key={messageKey}>
        {files.length > 0 && (
          <MessageAttachments className={message.role === "assistant" ? "ml-0" : undefined}>
            {files.map((file, fileIndex) => (
              <MessageAttachment key={`${messageKey}-file-${fileIndex}`} data={file} />
            ))}
          </MessageAttachments>
        )}
        {shouldRenderContent && (
          <MessageContent className={contentClassName}>
            {shouldRenderThoughtDisclosure && (
              <ChatThoughtDisclosure
                label={thoughtLabel}
                isOpen={activeThoughtKey === messageKey}
                onToggle={() => onThoughtToggle(messageKey)}
              />
            )}
            {hasText && <MessageResponse>{text}</MessageResponse>}
          </MessageContent>
        )}
        {shouldRenderCopyButton && <CopyMessageButton text={copyText} align={copyAlign} />}
      </Message>
    );
  });

  return (
    <div ref={listRef} className="contents">
      {hasSelection && selectionPosition && (
        <SelectionReplyButton position={selectionPosition} onReply={handleReply} />
      )}
      {nodes}
    </div>
  );
}
