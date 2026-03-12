"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
} from "react";
import { useImageAttachments } from "@/lib/integrations/images/use-image-attachments";
import { getChatAttachmentDropLimit, getChatAttachmentPasteFiles } from "./attachment-helpers";

export function useChatAttachments({
  attachmentsEnabled,
  globalDrop,
  maxAttachments,
  isLoading,
}: {
  attachmentsEnabled: boolean;
  globalDrop: boolean;
  maxAttachments?: number;
  isLoading?: boolean;
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const isDropEnabled = globalDrop && attachmentsEnabled;
  const {
    attachments,
    clearAttachments,
    isAtAttachmentLimit,
    isUploading,
    queueFiles,
    removeAttachment,
  } = useImageAttachments({
    attachmentsEnabled,
    maxAttachments,
    disabled: Boolean(isLoading),
    authErrorMessage: "Connect a wallet to upload images.",
  });
  const dropLimit = getChatAttachmentDropLimit(maxAttachments);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.currentTarget.files ?? []);
      if (!files.length) return;
      event.currentTarget.value = "";
      void queueFiles(files);
    },
    [queueFiles]
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      if (!attachmentsEnabled) return;
      const files = getChatAttachmentPasteFiles({
        items: event.clipboardData?.items,
        maxAttachments,
      });
      if (files.length === 0) return;
      if (isLoading || isUploading) return;
      void queueFiles(files);
    },
    [attachmentsEnabled, isLoading, isUploading, maxAttachments, queueFiles]
  );

  useEffect(() => {
    if (!isDropEnabled) return;

    const hasFiles = (event: DragEvent) => event.dataTransfer?.types?.includes("Files");
    const handleDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragCounterRef.current += 1;
      setIsDragActive(true);
    };
    const handleDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
    };
    const handleDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setIsDragActive(false);
      }
    };
    const handleDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragCounterRef.current = 0;
      setIsDragActive(false);
      if (isLoading || isUploading) return;
      const files = Array.from(event.dataTransfer?.files ?? []);
      void queueFiles(files);
    };

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, [isDropEnabled, isLoading, isUploading, queueFiles]);

  const handleRemoveAttachment = useCallback(
    (id: string) => {
      removeAttachment(id);
    },
    [removeAttachment]
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
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
  };
}
