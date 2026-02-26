"use client";

import { useMemo } from "react";
import type { AttachmentState } from "@/components/ui/chat-input/types";
import type { ReplyContextItem } from "@/lib/domains/chat/reply-context";

type UseChatInputSubmitStateInput = {
  input: string;
  attachments: AttachmentState[];
  replyContext: ReplyContextItem[];
};

export const useChatInputSubmitState = ({
  input,
  attachments,
  replyContext,
}: UseChatInputSubmitStateInput) =>
  useMemo(() => {
    const trimmedText = input.trim();
    const hasText = trimmedText.length > 0;
    const readyAttachments = attachments.filter((attachment) => attachment.status === "ready");
    const hasReadyAttachments = readyAttachments.length > 0;
    const hasReplyContext = replyContext.length > 0;
    const canSubmit = hasText || hasReadyAttachments;

    return {
      trimmedText,
      hasText,
      readyAttachments,
      hasReadyAttachments,
      hasReplyContext,
      canSubmit,
    };
  }, [attachments, input, replyContext]);
