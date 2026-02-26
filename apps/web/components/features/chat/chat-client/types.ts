import type { UIMessage } from "ai";
import type { ChatInputMessage } from "@/lib/domains/chat/input-message";
import type { JsonRecord } from "@/lib/shared/json";

export type ChatClientProps = {
  chatId: string;
  identityToken?: string;
  type?: string;
  data?: JsonRecord;
  initialMessages?: UIMessage[];
  initialGrant?: string | null;
  showConnectOnUnauthed?: boolean;
};

export type InlineError = {
  message: string;
  retryMessage?: ChatInputMessage;
};
