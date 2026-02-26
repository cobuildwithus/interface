import type { Dispatch, SetStateAction } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import type { ErrorLike } from "@/lib/shared/errors";
import {
  isUploadImageAuthError,
  MAX_IMAGE_SIZE_BYTES,
  uploadImage,
  validateImageFile,
} from "@/lib/integrations/images/upload-client";
import type { AttachmentState } from "./types";

const MAX_TOTAL_IMAGE_BYTES = MAX_IMAGE_SIZE_BYTES;

type UploadSelectedFileArgs = {
  file: File;
  setAttachments: Dispatch<SetStateAction<AttachmentState[]>>;
  revokeAttachmentUrl: (attachment: AttachmentState) => void;
};

export async function uploadSelectedFile({
  file,
  setAttachments,
  revokeAttachmentUrl,
}: UploadSelectedFileArgs) {
  const validation = validateImageFile(file);
  if (!validation.ok) {
    toast.error(validation.message);
    return;
  }

  const previewUrl = URL.createObjectURL(file);
  const attachmentId = nanoid();

  setAttachments((prev) =>
    prev.concat({
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
        setAttachments((prev) =>
          prev.map((item) => (item.id === attachmentId ? { ...item, progress } : item))
        );
      },
    });
    setAttachments((prev) =>
      prev.map((item) => {
        if (item.id !== attachmentId) return item;
        if (item.isLocal) {
          URL.revokeObjectURL(item.url);
        }
        return {
          ...item,
          url: uploadedUrl,
          status: "ready",
          isLocal: false,
          progress: 1,
        };
      })
    );
  } catch (error) {
    setAttachments((prev) => {
      const next = prev.filter((item) => item.id !== attachmentId);
      const removed = prev.find((item) => item.id === attachmentId);
      if (removed) revokeAttachmentUrl(removed);
      return next;
    });
    if (isUploadImageAuthError(error as ErrorLike)) {
      toast.error("Connect a wallet to upload images.");
    } else {
      const message = error instanceof Error ? error.message : "Failed to upload image.";
      toast.error(message);
    }
  }
}

type HandleFilesQueuedArgs = {
  files: File[];
  attachmentsEnabled: boolean;
  attachmentLimit: number | null;
  attachmentsRef: { current: AttachmentState[] };
  uploadFile: (file: File) => void | Promise<void>;
};

export function handleFilesQueued({
  files,
  attachmentsEnabled,
  attachmentLimit,
  attachmentsRef,
  uploadFile,
}: HandleFilesQueuedArgs) {
  if (!attachmentsEnabled || files.length === 0) return;
  const attachmentLimitMessage = attachmentLimit
    ? `You can attach up to ${attachmentLimit} images.`
    : null;
  const remaining = attachmentLimit
    ? Math.max(0, attachmentLimit - attachmentsRef.current.length)
    : files.length;
  let totalBytes = attachmentsRef.current.reduce((sum, attachment) => sum + attachment.size, 0);
  let warnedForSize = false;

  if (attachmentLimit && remaining === 0) {
    toast.error(attachmentLimitMessage ?? "You can attach up to 2 images.");
    return;
  }

  if (attachmentLimit && files.length > remaining) {
    toast.error(attachmentLimitMessage ?? "You can attach up to 2 images.");
  }

  const candidates = attachmentLimit ? files.slice(0, remaining) : files;

  for (const file of candidates) {
    if (totalBytes + file.size > MAX_TOTAL_IMAGE_BYTES) {
      if (!warnedForSize) {
        toast.error("Images exceed 10MB total.");
        warnedForSize = true;
      }
      continue;
    }
    void uploadFile(file);
    totalBytes += file.size;
  }
}
