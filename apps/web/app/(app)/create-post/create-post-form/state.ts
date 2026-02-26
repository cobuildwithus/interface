"use client";

import { useCallback, useEffect, useRef, useState, type ClipboardEventHandler } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ErrorLike } from "@/lib/shared/errors";
import type { GoalScope } from "@/lib/domains/goals/goal-scopes";
import { useCommandEnter } from "@/lib/hooks/use-command-enter";
import {
  isUploadImageAuthError,
  uploadImage,
  validateImageFile,
} from "@/lib/integrations/images/upload-client";
import { CONTENT_LIMIT, MAX_TOTAL_IMAGE_BYTES } from "./constants";
import { createAttachmentId } from "./utils";
import { createPostAction } from "../actions";
import type { PostAttachment } from "./types";

export function useCreatePostFormState({
  goalScope,
  hasSigner,
}: {
  goalScope?: GoalScope | null;
  hasSigner: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [attachments, setAttachments] = useState<PostAttachment[]>([]);
  const [isSignerDialogOpen, setSignerDialogOpen] = useState(false);
  const goalEmbedUrl = goalScope?.url ?? null;
  const objectUrlsRef = useRef(new Set<string>());

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  const combinedText = `${trimmedTitle}\n\n${trimmedContent}`;
  const combinedLength = combinedText.trim().length > 0 ? combinedText.length : 0;
  const isOverLimit = combinedLength > CONTENT_LIMIT;
  const isUploading = attachments.some((attachment) => attachment.isUploading);
  const totalAttachmentBytes = attachments.reduce((sum, attachment) => sum + attachment.size, 0);
  const attachmentImages = attachments.map((attachment) => attachment.url ?? attachment.previewUrl);
  const attachmentUrls = attachments.flatMap((attachment) =>
    attachment.url ? [attachment.url] : []
  );
  const maxAttachments = goalEmbedUrl ? 1 : 2;
  const isAtAttachmentLimit = attachments.length >= maxAttachments;
  const attachmentLimitMessage = `You can attach up to ${maxAttachments} ${
    maxAttachments === 1 ? "image" : "images"
  }.`;
  const canSubmit =
    trimmedTitle.length > 0 &&
    trimmedContent.length > 0 &&
    !isOverLimit &&
    !isPosting &&
    !isUploading;

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => {
      for (const url of objectUrls) {
        URL.revokeObjectURL(url);
      }
      objectUrls.clear();
    };
  }, []);

  const submitPost = async () => {
    if (!canSubmit) return;
    if (!hasSigner) {
      setSignerDialogOpen(true);
      return;
    }

    setIsPosting(true);

    const postPromise = (async () => {
      const result = await createPostAction({
        title: trimmedTitle,
        content: trimmedContent,
        ...(attachmentUrls.length > 0 ? { attachmentUrls } : {}),
        ...(goalEmbedUrl ? { embedUrl: goalEmbedUrl } : {}),
      });

      if (!result.ok) {
        if (result.status === 401 || result.status === 403) {
          setSignerDialogOpen(true);
        }
        throw new Error(result.error || "Failed to create post.");
      }

      return result;
    })();

    toast.promise(postPromise, {
      loading: "Creating post...",
      success: "Post created!",
      error: (err) => (err instanceof Error ? err.message : "Failed to create post."),
    });

    try {
      const payload = await postPromise;
      router.push(`/cast/${payload.hash}`);
    } catch {
      // Error already shown by toast.promise
    } finally {
      setIsPosting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitPost();
  };

  const handleCommandEnter = useCommandEnter(() => {
    void submitPost();
  }, canSubmit);

  const revokeObjectUrl = useCallback((url: string) => {
    if (url.startsWith("blob:") && objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  }, []);

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (isPosting || isUploading) return;

      const availableSlots = maxAttachments - attachments.length;
      if (availableSlots <= 0) {
        toast.error(attachmentLimitMessage);
        return;
      }

      const filesToUpload = files.slice(0, availableSlots);
      if (files.length > availableSlots) {
        toast.error(attachmentLimitMessage);
      }

      let totalBytes = totalAttachmentBytes;

      for (const file of filesToUpload) {
        const validation = validateImageFile(file);
        if (!validation.ok) {
          toast.error(validation.message);
          continue;
        }

        if (totalBytes + file.size > MAX_TOTAL_IMAGE_BYTES) {
          toast.error("Images exceed 10MB total.");
          continue;
        }

        totalBytes += file.size;

        const previewUrl = URL.createObjectURL(file);
        objectUrlsRef.current.add(previewUrl);
        const id = createAttachmentId();
        setAttachments((prev) => [
          ...prev,
          { id, url: null, previewUrl, isUploading: true, size: file.size },
        ]);

        try {
          const url = await uploadImage(file);
          setAttachments((prev) =>
            prev.map((attachment) =>
              attachment.id === id ? { ...attachment, url, isUploading: false } : attachment
            )
          );
          revokeObjectUrl(previewUrl);
          toast.success("Image attached.");
        } catch (error) {
          setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
          revokeObjectUrl(previewUrl);
          if (isUploadImageAuthError(error as ErrorLike)) {
            setSignerDialogOpen(true);
            break;
          }
          const message = error instanceof Error ? error.message : "Upload failed.";
          toast.error(message);
        }
      }
    },
    [
      attachments.length,
      attachmentLimitMessage,
      isPosting,
      isUploading,
      maxAttachments,
      revokeObjectUrl,
      totalAttachmentBytes,
    ]
  );

  const handlePaste: ClipboardEventHandler<HTMLTextAreaElement> = (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (const item of items) {
      if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
      const file = item.getAsFile();
      if (file) files.push(file);
    }

    if (files.length === 0) return;
    void handleUpload(files.slice(0, 2));
  };

  const handleRemoveAttachment = useCallback(
    (attachment: PostAttachment) => {
      if (attachment.isUploading) return;
      setAttachments((prev) => prev.filter((item) => item.id !== attachment.id));
      revokeObjectUrl(attachment.previewUrl);
    },
    [revokeObjectUrl]
  );

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  return {
    title,
    setTitle,
    content,
    setContent,
    attachments,
    attachmentImages,
    maxAttachments,
    isAtAttachmentLimit,
    combinedLength,
    canSubmit,
    isPosting,
    isUploading,
    isOverLimit,
    handleSubmit,
    handleUpload,
    handlePaste,
    handleRemoveAttachment,
    handleCommandEnter,
    handleCancel,
    isSignerDialogOpen,
    setSignerDialogOpen,
    attachmentLimitMessage,
  };
}
