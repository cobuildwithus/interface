import { Loader2, X } from "lucide-react";

export function InlineReplyAttachmentPreview({
  previewSrc,
  isUploading,
  onRemove,
  onOpen,
}: {
  previewSrc: string | null;
  isUploading: boolean;
  onRemove: () => void;
  onOpen: () => void;
}) {
  if (!previewSrc) return null;

  return (
    <div className="mb-3">
      <div className="border-border/60 bg-muted/20 relative w-40 overflow-hidden rounded-xl border">
        <button
          type="button"
          onClick={onOpen}
          disabled={isUploading}
          className="block w-full cursor-zoom-in"
          aria-label="Preview attached image"
        >
          <img src={previewSrc} alt="Attached image preview" className="h-24 w-full object-cover" />
        </button>
        {isUploading && (
          <div className="absolute inset-0 grid place-items-center bg-black/40">
            <Loader2 className="size-5 animate-spin text-white" />
          </div>
        )}
        {!isUploading && (
          <button
            type="button"
            onClick={onRemove}
            className="bg-background/90 text-foreground hover:bg-background absolute top-2 right-2 rounded-full p-1 shadow"
            aria-label="Remove attached image"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
}
