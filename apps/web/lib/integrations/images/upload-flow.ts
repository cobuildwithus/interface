"use client";

import {
  isUploadImageAuthError,
  MAX_IMAGE_SIZE_BYTES,
} from "@/lib/integrations/images/upload-client";
import type { ErrorLike } from "@/lib/shared/errors";

export type ImageAttachmentState = {
  id: string;
  url: string;
  mediaType: string;
  filename: string;
  status: "uploading" | "ready";
  isLocal: boolean;
  progress: number;
  size: number;
};

export const MAX_TOTAL_IMAGE_BYTES = MAX_IMAGE_SIZE_BYTES;
export const TOTAL_IMAGE_BYTES_EXCEEDED_MESSAGE = "Images exceed 10MB total.";

export function getImageAttachmentLimitMessage(limit: number) {
  return `You can attach up to ${limit} ${limit === 1 ? "image" : "images"}.`;
}

export function getClipboardImageFiles(items: DataTransferItemList | null | undefined): File[] {
  if (!items) return [];

  const files: File[] = [];
  for (const item of items) {
    if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (file) {
      files.push(file);
    }
  }

  return files;
}

export function revokeTrackedObjectUrl(
  url: string,
  trackedObjectUrls: Pick<Set<string>, "has" | "delete">
) {
  if (!url.startsWith("blob:") || !trackedObjectUrls.has(url)) {
    return;
  }

  URL.revokeObjectURL(url);
  trackedObjectUrls.delete(url);
}

type UploadImageErrorHandlingOptions = {
  onAuthError?: (() => void) | undefined;
  authErrorMessage?: string | null | undefined;
  fallbackMessage: string;
  onToastError: (message: string) => void;
};

export function handleUploadImageError(
  error: unknown,
  { onAuthError, authErrorMessage, fallbackMessage, onToastError }: UploadImageErrorHandlingOptions
) {
  const isAuthError = isUploadImageAuthError(error as ErrorLike);

  if (isAuthError && (onAuthError || authErrorMessage !== undefined)) {
    onAuthError?.();
    if (authErrorMessage) {
      onToastError(authErrorMessage);
    }
    return { isAuthError: true };
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  onToastError(message);
  return { isAuthError };
}
