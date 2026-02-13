"use client";

import { Avatar } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";

export function ProfilePhotoSection({
  previewSrc,
  displayName,
  resolvedUsername,
  canEdit,
  isUploading,
  onUploadClick,
  onFileChange,
  fileInputRef,
  accept,
}: {
  previewSrc: string | null;
  displayName: string;
  resolvedUsername: string | null;
  canEdit: boolean;
  isUploading: boolean;
  onUploadClick: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  accept: string;
}) {
  return (
    <div className="border-border/60 bg-muted/10 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <div className="border-border/60 bg-background/80 relative rounded-full border p-1 shadow-[0_12px_28px_-18px_rgba(15,23,42,0.6)]">
          <button
            type="button"
            onClick={onUploadClick}
            disabled={!canEdit || isUploading}
            aria-label="Upload profile photo"
            className="focus-visible:ring-offset-background group relative block rounded-full focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed"
          >
            <Avatar
              src={previewSrc}
              alt={displayName || resolvedUsername || "Farcaster profile"}
              size={72}
              fallback={(displayName || resolvedUsername || "?")[0]}
            />
            <span
              className={`absolute inset-0 grid place-items-center rounded-full border border-black/20 bg-black/45 text-white/90 backdrop-blur-sm transition ${
                isUploading
                  ? "opacity-100"
                  : canEdit
                    ? "opacity-0 group-hover:opacity-100"
                    : "opacity-0"
              }`}
            >
              {isUploading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Camera className="size-5" />
              )}
            </span>
          </button>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Profile photo</p>
          <p className="text-muted-foreground text-xs">
            PNG, JPG, GIF, WebP, SVG, HEIC - up to 10MB.
          </p>
          {isUploading && <p className="text-xs text-sky-500">Uploading...</p>}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}
