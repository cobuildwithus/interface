import type { ChatInputMessage } from "@/lib/domains/chat/input-message";
import type { ReplyContextItem } from "@/lib/domains/chat/reply-context";
import type { ImageAttachmentState } from "@/lib/integrations/images/upload-flow";

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

export type AttachmentState = ImageAttachmentState;
