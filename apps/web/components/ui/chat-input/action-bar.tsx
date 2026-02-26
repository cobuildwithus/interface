import { ArrowUp, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ActionBarProps = {
  attachmentsEnabled: boolean;
  isLoading: boolean;
  isUploading: boolean;
  isAtAttachmentLimit: boolean;
  canSubmit: boolean;
  onAttach: () => void;
  onSubmit: () => void;
};

export function ActionBar({
  attachmentsEnabled,
  isLoading,
  isUploading,
  isAtAttachmentLimit,
  canSubmit,
  onAttach,
  onSubmit,
}: ActionBarProps) {
  return (
    <div className="mt-1 mb-0.5 flex items-center justify-between">
      {attachmentsEnabled ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-md"
              className="rounded-full"
              type="button"
              aria-label="Attach images"
              onClick={onAttach}
              disabled={isLoading || isUploading || isAtAttachmentLimit}
            >
              <Paperclip className="text-muted-foreground size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            Attach images
          </TooltipContent>
        </Tooltip>
      ) : (
        <span />
      )}

      <Button
        size="icon-md"
        className="rounded-full"
        type="button"
        aria-label="Send prompt"
        onClick={onSubmit}
        disabled={isLoading || isUploading || !canSubmit}
      >
        <ArrowUp className="size-5" />
      </Button>
    </div>
  );
}
