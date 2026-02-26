"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
} from "react";
import type { AttachmentState } from "./types";
import { handleFilesQueued, uploadSelectedFile } from "./attachment-helpers";

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
  const [attachments, setAttachments] = useState<AttachmentState[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const attachmentsRef = useRef<AttachmentState[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const attachmentLimit = typeof maxAttachments === "number" ? maxAttachments : null;
  const isDropEnabled = globalDrop && attachmentsEnabled;

  const revokeAttachmentUrl = useCallback((attachment: AttachmentState) => {
    if (attachment.isLocal && attachment.url.startsWith("blob:")) {
      URL.revokeObjectURL(attachment.url);
    }
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments((prev) => {
      prev.forEach(revokeAttachmentUrl);
      return [];
    });
  }, [revokeAttachmentUrl]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach(revokeAttachmentUrl);
    };
  }, [revokeAttachmentUrl]);

  const uploadFile = useCallback(
    async (file: File) => {
      await uploadSelectedFile({ file, setAttachments, revokeAttachmentUrl });
    },
    [revokeAttachmentUrl]
  );

  const queueFiles = useCallback(
    (files: File[]) => {
      handleFilesQueued({
        files,
        attachmentsEnabled,
        attachmentLimit,
        attachmentsRef,
        uploadFile,
      });
    },
    [attachmentLimit, attachmentsEnabled, uploadFile]
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.currentTarget.files ?? []);
      if (!files.length) return;
      event.currentTarget.value = "";
      queueFiles(files);
    },
    [queueFiles]
  );

  const isUploading = attachments.some((attachment) => attachment.status === "uploading");
  const isAtAttachmentLimit = attachmentLimit ? attachments.length >= attachmentLimit : false;
  const dropLimit = attachmentLimit ?? 2;

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      if (!attachmentsEnabled) return;
      const items = event.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length === 0) return;
      if (isLoading || isUploading) return;
      const pasteLimit = Math.min(2, attachmentLimit ?? 2);
      queueFiles(files.slice(0, pasteLimit));
    },
    [attachmentLimit, attachmentsEnabled, isLoading, isUploading, queueFiles]
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
      queueFiles(files);
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
      setAttachments((prev) => {
        const found = prev.find((file) => file.id === id);
        if (found) {
          revokeAttachmentUrl(found);
        }
        return prev.filter((file) => file.id !== id);
      });
    },
    [revokeAttachmentUrl]
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
