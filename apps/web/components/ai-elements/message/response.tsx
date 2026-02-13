"use client";

import { ImageDialog, useImageDialog } from "@/components/common/image-dialog";
import { cn } from "@/lib/shared/utils";
import type { ComponentProps } from "react";
import { memo, useCallback, useMemo } from "react";
import { CornerUpLeft } from "lucide-react";
import { Streamdown } from "streamdown";
import { STREAMDOWN_BASE_CLASS } from "../streamdown";

export type MessageResponseProps = ComponentProps<typeof Streamdown>;
type ImageComponentProps = ComponentProps<"img"> & { node?: object };

const extractImageUrls = (content: string) => {
  if (!content) return [];
  const urls = new Set<string>();
  const markdownImageRegex = /!\[[^\]]*]\(([^)]+)\)/g;
  let match: RegExpExecArray | null = null;
  while ((match = markdownImageRegex.exec(content))) {
    const url = match[1]?.trim().split(/\s+/)[0];
    if (url) {
      urls.add(url);
    }
  }

  const htmlImageRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  while ((match = htmlImageRegex.exec(content))) {
    const url = match[1]?.trim();
    if (url) {
      urls.add(url);
    }
  }

  return Array.from(urls);
};

export const MessageResponse = memo(
  ({ className, children, ...props }: MessageResponseProps) => {
    const imageDialog = useImageDialog();
    const content = typeof children === "string" ? children : "";
    const images = useMemo(() => extractImageUrls(content), [content]);
    const ImageComponent = useCallback(
      ({ src, alt, className: imageClassName, ...imageProps }: ImageComponentProps) => {
        if (!src || typeof src !== "string") return null;
        const imageIndex = Math.max(0, images.indexOf(src));
        const handleClick = () =>
          imageDialog.openImage(images.length > 0 ? images : [src], imageIndex);
        return (
          <img
            alt={alt ?? ""}
            src={src}
            {...imageProps}
            onClick={handleClick}
            className={cn("cursor-zoom-in", imageClassName)}
          />
        );
      },
      [imageDialog, images]
    );
    const BlockquoteComponent = useCallback(
      ({ children }: ComponentProps<"blockquote">) => (
        <blockquote className="text-muted-foreground mb-3 text-sm italic">
          <div className="flex items-center gap-2">
            <CornerUpLeft className="size-4" />
            <div className="min-w-0 flex-1 [&_*]:text-inherit [&_p]:m-0">{children}</div>
          </div>
        </blockquote>
      ),
      []
    );
    const components = useMemo(
      () => ({ ...(props.components ?? {}), img: ImageComponent, blockquote: BlockquoteComponent }),
      [BlockquoteComponent, ImageComponent, props.components]
    );

    return (
      <>
        <Streamdown
          className={cn(STREAMDOWN_BASE_CLASS, className)}
          components={components}
          {...props}
        >
          {children}
        </Streamdown>
        <ImageDialog
          key={imageDialog.dialogKey}
          images={imageDialog.images}
          initialIndex={imageDialog.initialIndex}
          open={imageDialog.isOpen}
          onOpenChange={imageDialog.setIsOpen}
        />
      </>
    );
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

MessageResponse.displayName = "MessageResponse";
