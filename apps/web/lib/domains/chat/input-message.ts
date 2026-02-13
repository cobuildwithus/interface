import type { FileUIPart } from "ai";

export type ChatInputMessage = {
  text: string;
  files: FileUIPart[];
};

type ChatInputMessageInput = {
  text: string;
  files?: FileUIPart[] | null;
};

const coerceChatInputMessage = (message: Partial<ChatInputMessage> | null): ChatInputMessage => ({
  text: typeof message?.text === "string" ? message.text : "",
  files: Array.isArray(message?.files) ? message.files : [],
});

export const normalizeChatInputMessage = (message: ChatInputMessageInput): ChatInputMessage => ({
  text: message.text.trim(),
  files: message.files ?? [],
});

export const hasChatInputContent = (message: ChatInputMessage) =>
  message.text.trim().length > 0 || (message.files?.length ?? 0) > 0;

export const serializeChatInputMessage = (message: ChatInputMessage) =>
  JSON.stringify({
    text: message.text,
    files: message.files,
  });

export const parseChatInputMessage = (value: string | null): ChatInputMessage | null => {
  if (!value || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ChatInputMessage> | string | null;
    if (parsed && typeof parsed === "object") {
      const normalized = normalizeChatInputMessage(coerceChatInputMessage(parsed));
      if (hasChatInputContent(normalized)) {
        return normalized;
      }
    }
  } catch {
    // Fall back to plain text storage.
  }

  return { text: value, files: [] };
};
