"use client";

import { ChevronRight, SquarePen } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { ContextCopyButton } from "./context-copy-button";
import { cn } from "@/lib/shared/utils";
import { Button } from "@/components/ui/button";

type ContextSectionProps = {
  title: string;
  subtitle: string;
  content: string;
  editUrl?: string;
  defaultOpen?: boolean;
  index: number;
  accentColor: string;
};

export function ContextSection({
  title,
  subtitle,
  content,
  editUrl,
  defaultOpen = false,
  index,
  accentColor,
}: ContextSectionProps) {
  return (
    <details className="group" open={defaultOpen}>
      <summary className="bg-card/50 hover:bg-card flex w-full cursor-pointer list-none items-center gap-4 rounded-lg border p-4 transition-colors [&::-webkit-details-marker]:hidden">
        {/* Number badge */}
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold text-white",
            accentColor
          )}
        >
          {String(index).padStart(2, "0")}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h2 className="font-mono text-base font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground font-content mt-0.5 text-sm">{subtitle}</p>
        </div>

        {/* Chevron */}
        <ChevronRight className="text-muted-foreground h-5 w-5 shrink-0 transition-transform duration-200 group-open:rotate-90" />
      </summary>

      <div className="bg-card mt-2 overflow-hidden rounded-lg border">
        <div className="bg-muted/30 flex items-center justify-between border-b px-4 py-2">
          <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
            {title}.md
          </span>
          <div className="flex items-center gap-2">
            {editUrl ? (
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" asChild>
                <a href={editUrl} target="_blank" rel="noreferrer">
                  <SquarePen className="size-3.5" />
                  Edit
                </a>
              </Button>
            ) : null}
            <ContextCopyButton
              value={content}
              variant="ghost"
              size="sm"
              showLabel
              label="Copy"
              className="h-7 gap-1.5 text-xs"
            />
          </div>
        </div>
        <div className="p-4 md:p-6">
          <div className="prose prose-sm dark:prose-invert font-content max-w-none">
            <Markdown>{content}</Markdown>
          </div>
        </div>
      </div>
    </details>
  );
}
