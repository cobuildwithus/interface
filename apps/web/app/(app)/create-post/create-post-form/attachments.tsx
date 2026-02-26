"use client";

import { Loader2, X } from "lucide-react";
import type { PostAttachment } from "./types";

export function PostAttachmentsGrid({
  attachments,
  isPosting,
  onPreview,
  onRemove,
}: {
  attachments: PostAttachment[];
  isPosting: boolean;
  onPreview: (index: number) => void;
  onRemove: (attachment: PostAttachment) => void;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {attachments.map((attachment, index) => {
        const previewSrc = attachment.url ?? attachment.previewUrl;
        return (
          <div
            key={attachment.id}
            className="border-border/60 bg-muted/20 relative w-40 overflow-hidden rounded-xl border"
          >
            <button
              type="button"
              onClick={() => onPreview(index)}
              disabled={attachment.isUploading}
              className="block w-full cursor-zoom-in"
              aria-label={`Preview attached image ${index + 1}`}
            >
              <img
                src={previewSrc}
                alt={`Attached image ${index + 1} preview`}
                className="h-24 w-full object-cover"
              />
            </button>
            {attachment.isUploading && (
              <div className="absolute inset-0 grid place-items-center bg-black/40">
                <Loader2 className="size-5 animate-spin text-white" />
              </div>
            )}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRemove(attachment);
              }}
              disabled={attachment.isUploading || isPosting}
              className="bg-background/90 text-foreground hover:bg-background absolute top-2 right-2 rounded-full p-1 shadow disabled:opacity-60"
              aria-label={`Remove attached image ${index + 1}`}
            >
              <X className="size-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
