"use client";

import { Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SelectionReplyPosition } from "@/components/features/chat/chat-client/hooks/use-selection-reply";

type SelectionReplyButtonProps = {
  position: SelectionReplyPosition;
  onReply: () => void;
};

export function SelectionReplyButton({ position, onReply }: SelectionReplyButtonProps) {
  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{
        top: position.top,
        left: position.left,
        transform: position.transform,
      }}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="bg-background text-foreground hover:bg-background pointer-events-auto rounded-xl px-6 py-4 shadow-sm"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onReply}
      >
        <Reply className="size-4 rotate-180 transform" />
        Ask Cobuild
      </Button>
    </div>
  );
}
