"use client";

import { MessageAttachment, MessageAttachments } from "@/components/ai-elements/message";
import type { AttachmentState } from "./types";

const UploadProgressRing = ({ progress }: { progress: number }) => {
  const size = 28;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference * (1 - clamped);

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-muted-foreground/80 transition-all"
        />
      </svg>
      <span className="sr-only">{`Upload progress ${Math.round(clamped * 100)}%`}</span>
    </div>
  );
};

export function AttachmentList({
  attachments,
  onRemoveAttachment,
  onPreviewImages,
}: {
  attachments: AttachmentState[];
  onRemoveAttachment: (id: string) => void;
  onPreviewImages: (urls: string[], index: number) => void;
}) {
  if (attachments.length === 0) return null;

  const imageAttachments = attachments.filter((attachment) =>
    attachment.mediaType.startsWith("image/")
  );
  const imageUrls = imageAttachments.map((attachment) => attachment.url);
  const imageIndexById = new Map(
    imageAttachments.map((attachment, index) => [attachment.id, index])
  );

  return (
    <MessageAttachments className="ml-0 px-2 pb-2">
      {attachments.map((file) => {
        const imageIndex = imageIndexById.get(file.id);
        const canPreview =
          file.mediaType.startsWith("image/") &&
          imageIndex !== undefined &&
          file.status !== "uploading";

        return (
          <div className="relative" key={file.id}>
            <MessageAttachment
              data={{
                type: "file",
                url: file.url,
                mediaType: file.mediaType,
                filename: file.filename,
              }}
              showRemove={file.status === "ready"}
              onRemove={file.status === "ready" ? () => onRemoveAttachment(file.id) : undefined}
              onClick={canPreview ? () => onPreviewImages(imageUrls, imageIndex) : undefined}
              onKeyDown={(event) => {
                if (!canPreview) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPreviewImages(imageUrls, imageIndex);
                }
              }}
              role={canPreview ? "button" : undefined}
              tabIndex={canPreview ? 0 : undefined}
              className={canPreview ? "cursor-zoom-in" : undefined}
            />
            {file.status === "uploading" && (
              <div className="bg-background/70 absolute inset-0 grid place-items-center rounded-lg">
                <UploadProgressRing progress={file.progress} />
              </div>
            )}
          </div>
        );
      })}
    </MessageAttachments>
  );
}
