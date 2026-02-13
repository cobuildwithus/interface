"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImageDropzone, ImageDropzoneOverlay } from "@/components/ui/image-dropzone";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CharacterCounter } from "@/components/features/social/cast-composer/character-counter";
import { ConnectFarcasterCta } from "@/components/features/social/cast-composer/connect-farcaster-cta";
import { ImageDialog, useImageDialog } from "@/components/common/image-dialog";
import { FarcasterSignerDialog } from "@/components/features/auth/farcaster/farcaster-link-dialog";
import type { GoalScope } from "@/lib/domains/goals/goal-scopes";
import { cn } from "@/lib/shared/utils";
import { CONTENT_LIMIT } from "./create-post-form/constants";
import { PostAttachmentsGrid } from "./create-post-form/attachments";
import { useCreatePostFormState } from "./create-post-form/state";

export type CreatePostFormProps = {
  hasSigner: boolean;
  goalScope?: GoalScope | null;
};

export function CreatePostForm({ hasSigner, goalScope }: CreatePostFormProps) {
  const imageDialog = useImageDialog();
  const {
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
    handleSubmit,
    handleUpload,
    handlePaste,
    handleRemoveAttachment,
    handleCommandEnter,
    handleCancel,
    isSignerDialogOpen,
    setSignerDialogOpen,
  } = useCreatePostFormState({ goalScope, hasSigner });
  const scopePill = goalScope ? (
    <div className="flex">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="border-border/70 bg-muted text-muted-foreground hover:bg-muted/70 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors"
            aria-label={`Posting in goal: ${goalScope.label}`}
          >
            Goal: <span className="text-foreground ml-1">{goalScope.label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Posting in goal: {goalScope.label}
        </TooltipContent>
      </Tooltip>
    </div>
  ) : null;

  if (!hasSigner) {
    return (
      <>
        <FarcasterSignerDialog open={isSignerDialogOpen} onOpenChange={setSignerDialogOpen} />
        <div className="space-y-4">
          {scopePill}
          <div className="border-border bg-card rounded-xl border p-6">
            <ConnectFarcasterCta
              title="Connect Farcaster to post"
              description="Link your Farcaster account to start a discussion"
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <FarcasterSignerDialog open={isSignerDialogOpen} onOpenChange={setSignerDialogOpen} />
      <form onSubmit={handleSubmit} className="space-y-6">
        {scopePill}
        <ImageDropzone
          disabled={isPosting || isUploading || isAtAttachmentLimit}
          multiple
          maxFiles={maxAttachments}
          onDropFiles={handleUpload}
          onDropRejected={(message) => toast.error(message ?? "Unable to attach image.")}
          globalDrop
        >
          {({ rootProps, inputProps, open, isDragActive }) => (
            <>
              <ImageDropzoneOverlay
                active={isDragActive}
                title="Add images"
                description="Drop images anywhere to attach them to your discussion post."
              />
              <div
                {...rootProps}
                className={cn(
                  "border-border bg-card space-y-6 rounded-xl border p-6",
                  isDragActive ? "ring-ring/50 ring-offset-background ring-2 ring-offset-2" : ""
                )}
              >
                <input {...inputProps} />
                <Field>
                  <FieldLabel htmlFor="title">Title</FieldLabel>
                  <FieldContent>
                    <Input
                      id="title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="What's the topic?"
                      className="text-base"
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="content">Content</FieldLabel>
                  <FieldContent>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      onKeyDown={handleCommandEnter}
                      onPaste={handlePaste}
                      placeholder="Share your thoughts..."
                      className="font-content min-h-48 resize-none text-base leading-normal"
                    />
                  </FieldContent>
                </Field>

                <PostAttachmentsGrid
                  attachments={attachments}
                  isPosting={isPosting}
                  onPreview={(index) => imageDialog.openImage(attachmentImages, index)}
                  onRemove={handleRemoveAttachment}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      if (isPosting || isUploading) return;
                      open();
                    }}
                    disabled={isUploading || isAtAttachmentLimit}
                    aria-label={`Attach image (${attachments.length}/${maxAttachments})`}
                  >
                    {isUploading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <ImagePlus className="text-muted-foreground size-5" />
                    )}
                  </Button>
                  <CharacterCounter count={combinedLength} limit={CONTENT_LIMIT} />
                </div>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="ghost" onClick={handleCancel} disabled={isPosting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!canSubmit}>
                    {isPosting ? "Posting..." : "Post"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </ImageDropzone>
      </form>
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
