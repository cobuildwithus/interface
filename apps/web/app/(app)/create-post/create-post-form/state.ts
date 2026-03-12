"use client";

import { useCallback, useState, type ClipboardEventHandler } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { GoalScope } from "@/lib/domains/goals/goal-scopes";
import { useCommandEnter } from "@/lib/hooks/use-command-enter";
import { getClipboardImageFiles } from "@/lib/integrations/images/upload-flow";
import { useImageAttachments } from "@/lib/integrations/images/use-image-attachments";
import { CONTENT_LIMIT } from "./constants";
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
  const [isSignerDialogOpen, setSignerDialogOpen] = useState(false);
  const goalEmbedUrl = goalScope?.url ?? null;
  const maxAttachments = goalEmbedUrl ? 1 : 2;
  const { attachments, isAtAttachmentLimit, isUploading, queueFiles, removeAttachment } =
    useImageAttachments({
      maxAttachments,
      disabled: isPosting,
      uploadSuccessMessage: "Image attached.",
      onAuthError: () => setSignerDialogOpen(true),
      uploadMode: "sequential",
      stopOnAuthError: true,
    });

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  const combinedText = `${trimmedTitle}\n\n${trimmedContent}`;
  const combinedLength = combinedText.trim().length > 0 ? combinedText.length : 0;
  const isOverLimit = combinedLength > CONTENT_LIMIT;
  const attachmentImages = attachments.map((attachment) => attachment.url);
  const attachmentUrls = attachments.flatMap((attachment) =>
    attachment.status === "ready" && !attachment.isLocal ? [attachment.url] : []
  );
  const canSubmit =
    trimmedTitle.length > 0 &&
    trimmedContent.length > 0 &&
    !isOverLimit &&
    !isPosting &&
    !isUploading;

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

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (isPosting || isUploading) return;
      await queueFiles(files);
    },
    [isPosting, isUploading, queueFiles]
  );

  const handlePaste: ClipboardEventHandler<HTMLTextAreaElement> = (event) => {
    const files = getClipboardImageFiles(event.clipboardData?.items);
    if (files.length === 0) return;
    void handleUpload(files.slice(0, 2));
  };

  const handleRemoveAttachment = useCallback(
    (attachment: PostAttachment) => {
      if (attachment.status === "uploading") return;
      removeAttachment(attachment.id);
    },
    [removeAttachment]
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
  };
}
