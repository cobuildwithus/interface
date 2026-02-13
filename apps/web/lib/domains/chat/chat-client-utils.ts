import type { UIMessage } from "ai";
import {
  hasChatInputContent,
  normalizeChatInputMessage,
  type ChatInputMessage,
} from "@/lib/domains/chat/input-message";

export type PendingChatMessage = ChatInputMessage & { clientMessageId: string };

export const IDENTITY_TOKEN_STORAGE_KEY = "cobuild:privy-id-token";

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error.trim();
  return "Chat failed to send. Please try again.";
};

export const createClientMessageId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const getRetryMessageId = (
  retryMessage: PendingChatMessage,
  lastAttemptedMessage: PendingChatMessage | null
) =>
  lastAttemptedMessage?.clientMessageId === retryMessage.clientMessageId
    ? retryMessage.clientMessageId
    : null;

export const normalizeIfHasContent = (
  message: ChatInputMessage | PendingChatMessage
): PendingChatMessage | null => {
  const normalized = normalizeChatInputMessage(message);
  if (!hasChatInputContent(normalized)) return null;
  const clientMessageId =
    "clientMessageId" in message && message.clientMessageId
      ? message.clientMessageId
      : createClientMessageId();
  return { ...normalized, clientMessageId };
};

export const buildUiMessage = (message: PendingChatMessage): UIMessage => {
  const parts: UIMessage["parts"] = [...message.files];
  if (message.text.length > 0) {
    const textPart: UIMessage["parts"][number] = { type: "text", text: message.text };
    parts.push(textPart);
  }
  return {
    id: message.clientMessageId,
    role: "user",
    parts,
  };
};

export const safeSessionStorageGet = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

export const safeSessionStorageSet = (key: string, value: string) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {}
};

export const safeSessionStorageRemove = (key: string) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {}
};
