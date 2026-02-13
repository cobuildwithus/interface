"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/shared/utils";
import type { FileUIPart } from "ai";
import { PaperclipIcon, XIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes } from "react";

export type MessageAttachmentProps = HTMLAttributes<HTMLDivElement> & {
  data: FileUIPart;
  className?: string;
  onRemove?: () => void;
  showRemove?: boolean;
};

export function MessageAttachment({
  data,
  className,
  onRemove,
  showRemove = false,
  ...props
}: MessageAttachmentProps) {
  const filename = data.filename || "";
  const mediaType = data.mediaType?.startsWith("image/") && data.url ? "image" : "file";
  const isImage = mediaType === "image";
  const attachmentLabel = filename || (isImage ? "Image" : "Attachment");
  const removeVisibilityClass = showRemove
    ? "opacity-100"
    : "opacity-0 transition-opacity group-hover:opacity-100";
  const renderRemoveButton = (buttonClassName: string) => {
    if (!onRemove) return null;
    return (
      <Button
        aria-label="Remove attachment"
        className={cn(buttonClassName, removeVisibilityClass)}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        type="button"
        variant="ghost"
      >
        <XIcon />
        <span className="sr-only">Remove</span>
      </Button>
    );
  };

  return (
    <div
      className={cn(
        "border-border/60 bg-muted/20 group relative size-24 overflow-hidden rounded-lg border",
        className
      )}
      {...props}
    >
      {isImage ? (
        <>
          <img
            alt={filename || "attachment"}
            className="size-full object-cover"
            height={100}
            src={data.url}
            width={100}
          />
          {renderRemoveButton(
            "bg-background/80 hover:bg-background absolute right-2 top-2 size-6 rounded-full p-0 backdrop-blur-sm [&>svg]:size-3"
          )}
        </>
      ) : (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-muted text-muted-foreground flex size-full shrink-0 items-center justify-center rounded-lg">
                <PaperclipIcon className="size-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{attachmentLabel}</p>
            </TooltipContent>
          </Tooltip>
          {renderRemoveButton("hover:bg-accent size-6 shrink-0 rounded-full p-0 [&>svg]:size-3")}
        </>
      )}
    </div>
  );
}

export type MessageAttachmentsProps = ComponentProps<"div">;

export function MessageAttachments({ children, className, ...props }: MessageAttachmentsProps) {
  if (!children) {
    return null;
  }

  return (
    <div className={cn("ml-auto flex w-fit flex-wrap items-start gap-2", className)} {...props}>
      {children}
    </div>
  );
}
