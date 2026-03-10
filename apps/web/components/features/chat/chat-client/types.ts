import type { UIMessage } from "ai";
import type { ChatInputMessage } from "@/lib/domains/chat/input-message";
import type { JsonRecord } from "@/lib/shared/json";

export type ChatClientProps = {
  chatId: string;
  identityToken?: string;
  type?: string;
  data?: JsonRecord;
  context?: string;
  initialMessages?: UIMessage[];
  showConnectOnUnauthed?: boolean;
};

export type InlineError = {
  message: string;
  retryMessage?: ChatInputMessage;
};
