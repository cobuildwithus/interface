import type { ChatInputMessage } from "@/lib/domains/chat/input-message";
import type { ReplyContextItem } from "@/lib/domains/chat/reply-context";

export type ChatInputProps = {
  onSubmit: (message: ChatInputMessage) => boolean | void | Promise<boolean | void>;
  placeholder?: string;
  autoFocus?: boolean;
  isLoading?: boolean;
  className?: string;
  inputClassName?: string;
  attachmentsEnabled?: boolean;
  globalDrop?: boolean;
  maxAttachments?: number;
  accept?: string;
  replyContext?: ReplyContextItem[];
  onRemoveReplyContext?: (id: string) => void;
  onClearReplyContext?: () => void;
};

export type AttachmentState = {
  id: string;
  url: string;
  mediaType: string;
  filename: string;
  status: "uploading" | "ready";
  isLocal: boolean;
  progress: number;
  size: number;
};
