import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterCounter } from "@/components/features/social/cast-composer/character-counter";
import { CHARACTER_LIMIT } from "./constants";

export function InlineReplyFooter({
  textLength,
  isPosting,
  isUploading,
  canPost,
  onAttach,
  onPost,
}: {
  textLength: number;
  isPosting: boolean;
  isUploading: boolean;
  canPost: boolean;
  onAttach: () => void;
  onPost: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onAttach}
          disabled={isUploading}
          aria-label="Attach image"
        >
          {isUploading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ImagePlus className="text-muted-foreground size-5" />
          )}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <CharacterCounter count={textLength} limit={CHARACTER_LIMIT} size={20} />
        <Button size="sm" onClick={onPost} disabled={!canPost}>
          {isPosting ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}
