"use client";

import { cn } from "@/lib/shared/utils";

type TopicTitleProps = {
  text: string;
  as?: "h3" | "p" | "span";
  className?: string;
};

export function TopicTitle({ text, as: Tag = "span", className }: TopicTitleProps) {
  const resolvedText = text.trim() || "Untitled";

  return (
    <Tag className={cn("font-content", className)} title={resolvedText}>
      {resolvedText}
    </Tag>
  );
}
