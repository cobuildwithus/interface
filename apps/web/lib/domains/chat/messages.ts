import type { FileUIPart, ToolUIPart, UIMessage } from "ai";
import type { JsonRecord, JsonValue } from "@/lib/shared/json";

type TextPart = { type: "text"; text: string };
type ReasoningPart = { type: "reasoning"; text: string };
type FilePart = { type: "file" } & FileUIPart;
type WebSearchSource = { type?: string; url?: string };
type DynamicToolPart = {
  type: "dynamic-tool";
  toolName?: string;
  toolCallId?: string;
  state?: string;
  input?: JsonValue;
  output?: JsonValue;
  errorText?: string;
};
export type ToolPart = ToolUIPart | DynamicToolPart;
export type ThoughtUIPart = ReasoningPart | ToolPart;
type MessagePart = JsonValue | FileUIPart | ToolUIPart | DynamicToolPart;
type MessageWithParts = UIMessage & { parts?: MessagePart[] };
type PendingMetadata = { pending?: boolean };
const isRecord = (value: JsonValue | undefined): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function getMessageText(message: UIMessage): string {
  const parts = getMessageParts(message);
  const textFromParts = parts
    .filter(isTextPart)
    .map((part) => part.text)
    .join("");
  return textFromParts;
}

export function getMessageReasoning(message: UIMessage): string {
  const parts = getMessageParts(message);
  return parts
    .filter(isReasoningPart)
    .map((part) => part.text)
    .join("");
}

export function getMessageReasoningDurationMs(message: UIMessage): number | null {
  const metadata = (message as UIMessage & { metadata?: JsonValue }).metadata;
  if (!isRecord(metadata)) return null;
  const duration = metadata.reasoningDurationMs;
  if (typeof duration !== "number" || !Number.isFinite(duration) || duration < 0) return null;
  return duration;
}

export function getMessageFiles(message: UIMessage): FileUIPart[] {
  const parts = getMessageParts(message);
  return parts.filter(isFilePart);
}

export function getMessageToolParts(message: UIMessage): ToolPart[] {
  const parts = getMessageParts(message);
  return parts.filter(isToolPart);
}

export function getMessageThoughtParts(message: UIMessage): ThoughtUIPart[] {
  const parts = getMessageParts(message);
  return parts.filter(isThoughtPart);
}

export function isPendingAssistantMessage(message: UIMessage): boolean {
  if (message.role !== "assistant") return false;
  const metadata = (message as UIMessage & { metadata?: JsonValue }).metadata;
  if (!isRecord(metadata)) return false;
  return (metadata as PendingMetadata).pending === true;
}

export function getMessageKey(message: UIMessage, index: number, chatId?: string): string {
  const baseKey = message.id ?? `${message.role}-${index}`;
  return chatId ? `${chatId}:${baseKey}` : baseKey;
}

export function getWebSearchSources(part: ToolUIPart): string[] {
  const output = (part as { output?: JsonValue }).output;
  if (!isRecord(output)) return [];
  const sources = output.sources;
  if (!Array.isArray(sources)) return [];

  const urls = sources
    .map((source) => {
      if (!isRecord(source)) return null;
      const { type, url } = source as WebSearchSource;
      if (type && type !== "url") return null;
      if (typeof url !== "string") return null;
      if (!url.startsWith("http://") && !url.startsWith("https://")) return null;
      return url;
    })
    .filter((url): url is string => typeof url === "string");

  return Array.from(new Set(urls));
}

function getMessageParts(message: UIMessage): MessagePart[] {
  const parts = (message as MessageWithParts).parts;
  return Array.isArray(parts) ? parts : [];
}

function isTextPart(part: MessagePart): part is TextPart {
  return (
    !!part &&
    typeof part === "object" &&
    (part as { type?: string }).type === "text" &&
    typeof (part as { text?: string }).text === "string"
  );
}

function isReasoningPart(part: MessagePart): part is ReasoningPart {
  return (
    !!part &&
    typeof part === "object" &&
    (part as { type?: string }).type === "reasoning" &&
    typeof (part as { text?: string }).text === "string"
  );
}

function isFilePart(part: MessagePart): part is FilePart {
  return (
    !!part &&
    typeof part === "object" &&
    (part as { type?: string }).type === "file" &&
    typeof (part as { url?: string }).url === "string" &&
    typeof (part as { mediaType?: string }).mediaType === "string"
  );
}

function isToolPart(part: MessagePart): part is ToolPart {
  return (
    !!part &&
    typeof part === "object" &&
    typeof (part as { type?: string }).type === "string" &&
    ((part as { type: string }).type.startsWith("tool-") ||
      (part as { type: string }).type === "dynamic-tool")
  );
}

function isThoughtPart(part: MessagePart): part is ThoughtUIPart {
  return isReasoningPart(part) || isToolPart(part);
}
