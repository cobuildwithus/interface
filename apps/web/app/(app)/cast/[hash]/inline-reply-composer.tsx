"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { ImageDropzone, ImageDropzoneOverlay } from "@/components/ui/image-dropzone";
import { Textarea } from "@/components/ui/textarea";
import { ConnectFarcasterCta } from "@/components/features/social/cast-composer/connect-farcaster-cta";
import { QuotedCastPreview } from "@/components/features/social/cast-composer/quoted-cast-preview";
import { ImageDialog, useImageDialog } from "@/components/common/image-dialog";
import { FarcasterSignerDialog } from "@/components/features/auth/farcaster/farcaster-link-dialog";
import { cn } from "@/lib/shared/utils";
import type { ErrorLike } from "@/lib/shared/errors";
import {
  isUploadImageAuthError,
  uploadImage,
  validateImageFile,
} from "@/lib/integrations/images/upload-client";
import { useCommandEnter } from "@/lib/hooks/use-command-enter";
import { InlineReplyAttachmentPreview } from "./inline-reply-composer/attachment-preview";
import { InlineReplyFooter } from "./inline-reply-composer/footer";
import { CHARACTER_LIMIT } from "./inline-reply-composer/constants";
import type { InlineReplyComposerProps } from "./inline-reply-composer/types";
import { createImagePasteHandler } from "./inline-reply-composer/paste";

export function InlineReplyComposer({
  targetCast,
  rootCast,
  onPost,
  onCancel,
  hasSigner,
}: InlineReplyComposerProps) {
  const [text, setText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSignerDialogOpen, setSignerDialogOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageDialog = useImageDialog();
  const isOverLimit = text.length > CHARACTER_LIMIT;
  const canPost = text.trim().length > 0 && !isOverLimit && !isPosting && !isUploading;
  const isReplyingToRoot = targetCast.hash === rootCast.hash;
  const previewSrc = localPreview || attachmentUrl;

  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const handlePost = async () => {
    if (!canPost) return;
    if (!hasSigner) {
      setSignerDialogOpen(true);
      return;
    }
    setIsPosting(true);
    const result = await onPost(
      text,
      targetCast.hash,
      targetCast.author?.fid ?? null,
      attachmentUrl
    );
    setIsPosting(false);
    if (result.ok) {
      setText("");
      setAttachmentUrl(null);
      setLocalPreview(null);
      return;
    }
    if (result.status === 401 || result.status === 403) {
      setSignerDialogOpen(true);
    }
  };

  const handleCommandEnter = useCommandEnter(() => {
    void handlePost();
  }, canPost);

  const handleRemoveAttachment = () => {
    if (isUploading) return;
    setAttachmentUrl(null);
    setLocalPreview(null);
  };

  const handleUpload = useCallback(
    async (file: File) => {
      if (isPosting || isUploading) return;

      const validation = validateImageFile(file);
      if (!validation.ok) {
        toast.error(validation.message);
        return;
      }

      const previousAttachment = attachmentUrl;
      const previewUrl = URL.createObjectURL(file);
      setLocalPreview(previewUrl);
      setIsUploading(true);

      try {
        const url = await uploadImage(file);
        setAttachmentUrl(url);
        setLocalPreview(null);
        toast.success("Image attached.");
      } catch (error) {
        if (isUploadImageAuthError(error as ErrorLike)) {
          setSignerDialogOpen(true);
          setAttachmentUrl(previousAttachment);
          setLocalPreview(null);
          return;
        }
        const message = error instanceof Error ? error.message : "Upload failed.";
        toast.error(message);
        setAttachmentUrl(previousAttachment);
        setLocalPreview(null);
      } finally {
        setIsUploading(false);
      }
    },
    [attachmentUrl, isPosting, isUploading]
  );

  const handlePaste = createImagePasteHandler(handleUpload);

  return (
    <>
      <FarcasterSignerDialog open={isSignerDialogOpen} onOpenChange={setSignerDialogOpen} />
      <ImageDropzone
        disabled={isPosting || isUploading}
        onDropFile={handleUpload}
        onDropRejected={(message) => toast.error(message ?? "Unable to attach image.")}
        globalDrop
      >
        {({ rootProps, inputProps, open, isDragActive }) => {
          const { ref: dropzoneRef, ...restRootProps } = rootProps;
          const setContainerRef = (node: HTMLDivElement | null) => {
            containerRef.current = node;
            if (typeof dropzoneRef === "function") {
              dropzoneRef(node);
            } else if (dropzoneRef) {
              (dropzoneRef as MutableRefObject<HTMLDivElement | null>).current = node;
            }
          };

          return (
            <>
              <ImageDropzoneOverlay
                active={isDragActive}
                title="Add an image"
                description="Drop an image anywhere to attach it to your reply."
              />
              <div
                {...restRootProps}
                ref={setContainerRef}
                className={cn(
                  "border-border bg-card rounded-xl border p-4",
                  isDragActive ? "ring-ring/50 ring-offset-background ring-2 ring-offset-2" : ""
                )}
              >
                <input {...inputProps} />
                {/* Header */}
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    {isReplyingToRoot ? "Reply to thread" : "Reply to post"}
                  </h3>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {!hasSigner ? (
                  <ConnectFarcasterCta />
                ) : (
                  <>
                    {/* Quoted post */}
                    {!isReplyingToRoot && (
                      <div className="mb-3">
                        <QuotedCastPreview cast={targetCast} />
                      </div>
                    )}

                    {/* Textarea */}
                    <Textarea
                      ref={textareaRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleCommandEnter}
                      onPaste={handlePaste}
                      placeholder="Write your reply..."
                      disabled={isPosting}
                      className="font-content mb-3 min-h-24 resize-none text-base leading-normal"
                    />

                    <InlineReplyAttachmentPreview
                      previewSrc={previewSrc}
                      isUploading={isUploading}
                      onRemove={handleRemoveAttachment}
                      onOpen={() => imageDialog.openImage([previewSrc ?? ""], 0)}
                    />

                    {/* Footer */}
                    <InlineReplyFooter
                      textLength={text.length}
                      isPosting={isPosting}
                      isUploading={isUploading}
                      canPost={canPost}
                      onAttach={() => {
                        if (isPosting || isUploading) return;
                        open();
                      }}
                      onPost={handlePost}
                    />
                  </>
                )}
              </div>
            </>
          );
        }}
      </ImageDropzone>
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
