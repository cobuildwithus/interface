"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { uploadImage, validateImageFile } from "@/lib/integrations/images/upload-client";
import {
  getImageAttachmentLimitMessage,
  handleUploadImageError,
  MAX_TOTAL_IMAGE_BYTES,
  revokeTrackedObjectUrl,
  TOTAL_IMAGE_BYTES_EXCEEDED_MESSAGE,
} from "@/lib/integrations/images/upload-flow";
import type { ImageAttachmentState } from "@/lib/integrations/images/upload-flow";

type UseImageAttachmentsOptions = {
  attachmentsEnabled?: boolean;
  maxAttachments?: number | null;
  disabled?: boolean;
  uploadSuccessMessage?: string | null;
  authErrorMessage?: string | null;
  onAuthError?: () => void;
  uploadMode?: "parallel" | "sequential";
  stopOnAuthError?: boolean;
};

export function useImageAttachments({
  attachmentsEnabled = true,
  maxAttachments,
  disabled = false,
  uploadSuccessMessage = null,
  authErrorMessage,
  onAuthError,
  uploadMode = "parallel",
  stopOnAuthError = false,
}: UseImageAttachmentsOptions) {
  const [attachments, setAttachments] = useState<ImageAttachmentState[]>([]);
  const attachmentsRef = useRef<ImageAttachmentState[]>([]);
  const trackedObjectUrlsRef = useRef(new Set<string>());
  const attachmentLimit = typeof maxAttachments === "number" ? maxAttachments : null;

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    const trackedObjectUrls = trackedObjectUrlsRef.current;
    return () => {
      for (const url of trackedObjectUrls) {
        URL.revokeObjectURL(url);
      }
      trackedObjectUrls.clear();
    };
  }, []);

  const revokeObjectUrl = useCallback((url: string) => {
    revokeTrackedObjectUrl(url, trackedObjectUrlsRef.current);
  }, []);

  const revokeAttachmentUrl = useCallback(
    (attachment: ImageAttachmentState) => {
      if (attachment.isLocal) {
        revokeObjectUrl(attachment.url);
      }
    },
    [revokeObjectUrl]
  );

  const clearAttachments = useCallback(() => {
    setAttachments((previousAttachments) => {
      previousAttachments.forEach(revokeAttachmentUrl);
      return [];
    });
  }, [revokeAttachmentUrl]);

  const removeAttachment = useCallback(
    (id: string) => {
      setAttachments((previousAttachments) => {
        const attachment = previousAttachments.find((item) => item.id === id);
        if (attachment) {
          revokeAttachmentUrl(attachment);
        }
        return previousAttachments.filter((item) => item.id !== id);
      });
    },
    [revokeAttachmentUrl]
  );

  const startUpload = useCallback(
    async (file: File) => {
      const previewUrl = URL.createObjectURL(file);
      trackedObjectUrlsRef.current.add(previewUrl);
      const attachmentId = nanoid();

      setAttachments((previousAttachments) =>
        previousAttachments.concat({
          id: attachmentId,
          url: previewUrl,
          mediaType: file.type,
          filename: file.name,
          status: "uploading",
          isLocal: true,
          progress: 0,
          size: file.size,
        })
      );

      try {
        const uploadedUrl = await uploadImage(file, {
          onProgress: (progress) => {
            setAttachments((previousAttachments) =>
              previousAttachments.map((attachment) =>
                attachment.id === attachmentId ? { ...attachment, progress } : attachment
              )
            );
          },
        });

        setAttachments((previousAttachments) =>
          previousAttachments.map((attachment) => {
            if (attachment.id !== attachmentId) {
              return attachment;
            }

            return {
              ...attachment,
              url: uploadedUrl,
              status: "ready",
              isLocal: false,
              progress: 1,
            };
          })
        );
        revokeObjectUrl(previewUrl);

        if (uploadSuccessMessage) {
          toast.success(uploadSuccessMessage);
        }

        return { isAuthError: false };
      } catch (error) {
        setAttachments((previousAttachments) => {
          const nextAttachments = previousAttachments.filter(
            (attachment) => attachment.id !== attachmentId
          );
          const removedAttachment = previousAttachments.find(
            (attachment) => attachment.id === attachmentId
          );
          if (removedAttachment) {
            revokeAttachmentUrl(removedAttachment);
          }
          return nextAttachments;
        });

        return handleUploadImageError(error, {
          onAuthError,
          authErrorMessage,
          fallbackMessage: "Failed to upload image.",
          onToastError: toast.error,
        });
      }
    },
    [authErrorMessage, onAuthError, revokeAttachmentUrl, revokeObjectUrl, uploadSuccessMessage]
  );

  const queueFiles = useCallback(
    async (files: File[]) => {
      if (!attachmentsEnabled || disabled || files.length === 0) {
        return;
      }

      const currentAttachments = attachmentsRef.current;
      const remainingAttachmentSlots = attachmentLimit
        ? Math.max(0, attachmentLimit - currentAttachments.length)
        : files.length;

      if (attachmentLimit && remainingAttachmentSlots === 0) {
        toast.error(getImageAttachmentLimitMessage(attachmentLimit));
        return;
      }

      if (attachmentLimit && files.length > remainingAttachmentSlots) {
        toast.error(getImageAttachmentLimitMessage(attachmentLimit));
      }

      const candidateFiles = attachmentLimit ? files.slice(0, remainingAttachmentSlots) : files;
      const acceptedFiles: File[] = [];
      let totalBytes = currentAttachments.reduce((sum, attachment) => sum + attachment.size, 0);
      let warnedForSize = false;

      for (const file of candidateFiles) {
        const validation = validateImageFile(file);
        if (!validation.ok) {
          toast.error(validation.message);
          continue;
        }

        if (totalBytes + file.size > MAX_TOTAL_IMAGE_BYTES) {
          if (!warnedForSize) {
            toast.error(TOTAL_IMAGE_BYTES_EXCEEDED_MESSAGE);
            warnedForSize = true;
          }
          continue;
        }

        totalBytes += file.size;
        acceptedFiles.push(file);
      }

      if (uploadMode === "sequential") {
        for (const file of acceptedFiles) {
          const result = await startUpload(file);
          if (result.isAuthError && stopOnAuthError) {
            break;
          }
        }
        return;
      }

      for (const file of acceptedFiles) {
        void startUpload(file);
      }
    },
    [attachmentLimit, attachmentsEnabled, disabled, startUpload, stopOnAuthError, uploadMode]
  );

  const isUploading = attachments.some((attachment) => attachment.status === "uploading");
  const isAtAttachmentLimit = attachmentLimit ? attachments.length >= attachmentLimit : false;

  return {
    attachments,
    clearAttachments,
    isAtAttachmentLimit,
    isUploading,
    queueFiles,
    removeAttachment,
  };
}
