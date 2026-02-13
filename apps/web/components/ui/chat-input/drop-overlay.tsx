"use client";

import { ImagePlus } from "lucide-react";

export function DropOverlay({ dropLimit }: { dropLimit: number }) {
  return (
    <div className="bg-background/70 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="border-border bg-card/90 w-full max-w-md rounded-3xl border px-10 py-8 text-center shadow-xl">
        <div className="bg-muted mx-auto mb-4 grid size-14 place-items-center rounded-2xl">
          <ImagePlus className="text-foreground size-7" />
        </div>
        <p className="text-lg font-semibold">Add anything</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Drop up to {dropLimit} {dropLimit === 1 ? "image" : "images"} to add them to the
          conversation.
        </p>
      </div>
    </div>
  );
}
