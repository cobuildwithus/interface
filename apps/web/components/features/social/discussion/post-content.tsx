"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/shared/utils";
import { LinkifiedText } from "./linkified-text";

type ImageDialogApi = {
  openImage: (imageUrls: string[], index?: number) => void;
};

type PostContentProps = {
  text: string | null;
  quote?: ReactNode;
  imageAttachment?: { url: string; label?: string | null } | null;
  imageDialog?: ImageDialogApi | null;
  textClassName?: string;
  emptyText?: string;
};

export function PostContent({
  text,
  quote,
  imageAttachment,
  imageDialog,
  textClassName,
  emptyText = "No text",
}: PostContentProps) {
  return (
    <div className="min-w-0 flex-1 space-y-3">
      {quote ? <div>{quote}</div> : null}

      <div
        className={cn(
          "text-foreground/90 font-content text-base leading-normal whitespace-pre-wrap",
          textClassName
        )}
      >
        {text ? (
          <LinkifiedText text={text} />
        ) : (
          <span className="text-muted-foreground italic">{emptyText}</span>
        )}
      </div>

      {imageAttachment && imageDialog ? (
        <button
          type="button"
          onClick={() => imageDialog.openImage([imageAttachment.url], 0)}
          className="block w-fit cursor-zoom-in overflow-hidden rounded-lg"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageAttachment.url}
            alt={imageAttachment.label ?? ""}
            className="max-h-40 w-auto rounded-lg object-contain transition-opacity hover:opacity-90"
            loading="lazy"
          />
        </button>
      ) : null}
    </div>
  );
}
