import type { UIMessage } from "ai";
import { getMessageText, isPendingAssistantMessage } from "@/lib/domains/chat/messages";

export type ChatMessageState = {
  visibleMessages: UIMessage[];
  activeAssistantIndex: number;
  activeAssistantMessage: UIMessage | null;
  activeAssistantText: string;
  lastUserText: string;
  hasPendingAssistant: boolean;
};

export const shouldShowThinking = ({
  shouldShowConnect,
  hasPendingAssistant,
  isSubmitted,
  isStreaming,
  activeAssistantText,
}: {
  shouldShowConnect: boolean;
  hasPendingAssistant: boolean;
  isSubmitted: boolean;
  isStreaming: boolean;
  activeAssistantText: string;
}) =>
  !shouldShowConnect && !activeAssistantText && (hasPendingAssistant || isSubmitted || isStreaming);

export const formatReasoningDuration = (durationMs: number) => {
  if (!Number.isFinite(durationMs) || durationMs < 0) return "";
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
};

export const formatThoughtLabel = (durationMs: number | null) => {
  if (durationMs === null) return "";
  const formatted = formatReasoningDuration(durationMs);
  return formatted ? `Thought for ${formatted}` : "";
};

const findLastIndex = <T>(items: T[], predicate: (item: T) => boolean) => {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) {
      return index;
    }
  }
  return -1;
};

const getLastIndexByRole = (messages: UIMessage[], role: UIMessage["role"]) =>
  findLastIndex(messages, (message) => message.role === role);

export const buildChatMessageState = (messages: UIMessage[]): ChatMessageState => {
  const hasPendingAssistant = messages.some(isPendingAssistantMessage);
  const visibleMessages = messages.filter(
    (message) => message.role !== "system" && !isPendingAssistantMessage(message)
  );
  const lastUserIndex = getLastIndexByRole(visibleMessages, "user");
  const lastAssistantIndex = getLastIndexByRole(visibleMessages, "assistant");
  const activeAssistantIndex = lastAssistantIndex > lastUserIndex ? lastAssistantIndex : -1;
  const activeAssistantMessage =
    activeAssistantIndex >= 0 ? visibleMessages[activeAssistantIndex] : null;
  const activeAssistantText = activeAssistantMessage
    ? getMessageText(activeAssistantMessage).trim()
    : "";
  const lastUserText =
    lastUserIndex >= 0 ? getMessageText(visibleMessages[lastUserIndex]).trim() : "";

  return {
    visibleMessages,
    activeAssistantIndex,
    activeAssistantMessage,
    activeAssistantText,
    lastUserText,
    hasPendingAssistant,
  };
};
