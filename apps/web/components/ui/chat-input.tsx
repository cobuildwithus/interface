"use client";

import type { FileUIPart } from "ai";
import { useCallback, useMemo, useRef, useState } from "react";
import { ImageDialog, useImageDialog } from "@/components/common/image-dialog";
import { Textarea } from "@/components/ui/textarea";
import { IMAGE_ACCEPT_ATTRIBUTE } from "@/lib/integrations/images/upload-client";
import { useChatInputSubmitState } from "@/lib/hooks/use-chat-input-submit-state";
import { buildReplyPrefix } from "@/lib/domains/chat/reply-context";
import { cn } from "@/lib/shared/utils";
import { ActionBar } from "./chat-input/action-bar";
import { AttachmentList } from "./chat-input/attachments";
import { DropOverlay } from "./chat-input/drop-overlay";
import { ReplyContext } from "./chat-input/reply-context";
import { useChatAttachments } from "./chat-input/use-chat-attachments";
import type { ChatInputProps } from "./chat-input/types";

export type { ChatInputProps } from "./chat-input/types";

export function ChatInput({
  onSubmit,
  placeholder = "Build anything",
  autoFocus,
  isLoading,
  className,
  inputClassName,
  attachmentsEnabled = true,
  globalDrop = false,
  maxAttachments,
  accept = IMAGE_ACCEPT_ATTRIBUTE,
  replyContext = [],
  onRemoveReplyContext,
  onClearReplyContext,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageDialog = useImageDialog();
  const {
    attachments,
    clearAttachments,
    fileInputRef,
    isDragActive,
    isDropEnabled,
    isUploading,
    isAtAttachmentLimit,
    dropLimit,
    handleFileChange,
    handlePaste,
    handleRemoveAttachment,
    openFilePicker,
  } = useChatAttachments({
    attachmentsEnabled,
    globalDrop,
    maxAttachments,
    isLoading,
  });
  const replyPrefix = useMemo(
    () => (replyContext.length > 0 ? buildReplyPrefix(replyContext) : ""),
    [replyContext]
  );
  const submitState = useChatInputSubmitState({ input, attachments, replyContext });

  const handleSubmit = useCallback(async () => {
    if (!submitState.canSubmit) return;
    if (isUploading) return;

    const composedText = submitState.hasReplyContext
      ? [replyPrefix, submitState.trimmedText].filter(Boolean).join("\n\n")
      : submitState.trimmedText;
    const files: FileUIPart[] = submitState.readyAttachments.map((attachment) => ({
      type: "file",
      url: attachment.url,
      mediaType: attachment.mediaType,
      filename: attachment.filename,
    }));

    const result = await onSubmit({ text: composedText, files });
    if (result !== false) {
      setInput("");
      clearAttachments();
      onClearReplyContext?.();
    }

    textareaRef.current?.focus();
  }, [clearAttachments, isUploading, onClearReplyContext, onSubmit, replyPrefix, submitState]);

  return (
    <>
      {isDropEnabled && isDragActive && <DropOverlay dropLimit={dropLimit} />}
      <section
        className={cn(
          "border-border bg-card overflow-hidden rounded-[28px] border px-2.5 pt-2 pb-2 shadow-xs",
          className
        )}
      >
        {attachmentsEnabled && (
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        )}

        <ReplyContext items={replyContext} onRemove={onRemoveReplyContext} />

        <AttachmentList
          attachments={attachments}
          onRemoveAttachment={handleRemoveAttachment}
          onPreviewImages={imageDialog.openImage}
        />

        <Textarea
          ref={textareaRef}
          placeholder={placeholder}
          rows={1}
          autoFocus={autoFocus}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onPaste={handlePaste}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              if (event.nativeEvent.isComposing) {
                return;
              }
              event.preventDefault();
              if (!isLoading && !isUploading) {
                void handleSubmit();
              }
            }
          }}
          className={cn(
            "min-h-0 resize-none appearance-none rounded-none border-0 bg-transparent px-2 text-base leading-normal shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent",
            inputClassName
          )}
        />

        <ActionBar
          attachmentsEnabled={attachmentsEnabled}
          isLoading={isLoading ?? false}
          isUploading={isUploading}
          isAtAttachmentLimit={isAtAttachmentLimit}
          canSubmit={submitState.canSubmit}
          onAttach={openFilePicker}
          onSubmit={handleSubmit}
        />
      </section>
      <ImageDialog
        key={imageDialog.dialogKey}
        images={imageDialog.images}
        initialIndex={imageDialog.initialIndex}
        open={imageDialog.isOpen}
        onOpenChange={imageDialog.setIsOpen}
      />
    </>
  );
}
