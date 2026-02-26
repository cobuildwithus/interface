"use client";

import { ImageDialog, useImageDialog } from "@/components/common/image-dialog";

type PostContentProps = {
  text: string;
  mediaUrls?: string[];
};

export function SocialPostContent({ text, mediaUrls = [] }: PostContentProps) {
  const imageDialog = useImageDialog();

  return (
    <div className="space-y-3">
      {text ? (
        <p className="text-foreground/90 font-content text-[17px] leading-normal whitespace-pre-wrap">
          {text}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm italic">No text</p>
      )}

      {mediaUrls.length > 0 && <PostMediaGrid mediaUrls={mediaUrls} imageDialog={imageDialog} />}

      <ImageDialog
        key={imageDialog.dialogKey}
        images={imageDialog.images}
        initialIndex={imageDialog.initialIndex}
        open={imageDialog.isOpen}
        onOpenChange={imageDialog.setIsOpen}
      />
    </div>
  );
}

type PostMediaGridProps = {
  mediaUrls: string[];
  imageDialog: ReturnType<typeof useImageDialog>;
};

export function PostMediaGrid({ mediaUrls, imageDialog }: PostMediaGridProps) {
  if (mediaUrls.length === 0) return null;

  return (
    <div
      className={`grid gap-0.5 overflow-hidden rounded-2xl ${
        mediaUrls.length === 1
          ? "grid-cols-1"
          : mediaUrls.length === 2
            ? "grid-cols-2"
            : mediaUrls.length === 3
              ? "grid-cols-2"
              : "grid-cols-2"
      }`}
    >
      {mediaUrls.slice(0, 4).map((mediaUrl, index) => (
        <button
          key={mediaUrl}
          type="button"
          onClick={() => imageDialog.openImage(mediaUrls, index)}
          className={`relative block cursor-zoom-in overflow-hidden bg-black/5 ${
            mediaUrls.length === 1
              ? ""
              : mediaUrls.length === 3 && index === 0
                ? "row-span-2 aspect-auto h-full"
                : "aspect-square"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl}
            alt=""
            className={`transition-opacity hover:opacity-90 ${
              mediaUrls.length === 1
                ? "max-h-[512px] w-auto rounded-2xl"
                : "h-full w-full object-cover"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
