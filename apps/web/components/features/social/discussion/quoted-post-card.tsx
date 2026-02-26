"use client";

import type { ReactNode } from "react";
import { DateTime } from "@/components/ui/date-time";
import { cn } from "@/lib/shared/utils";
import { LinkifiedText } from "./linkified-text";

type QuotedPostCardProps = {
  username: string;
  text: string;
  createdAt?: Date | null;
  children?: ReactNode;
  className?: string;
  textClassName?: string;
};

export function QuotedPostCard({
  username,
  text,
  createdAt,
  children,
  className,
  textClassName,
}: QuotedPostCardProps) {
  return (
    <div
      className={cn(
        "border-muted-foreground/30 bg-muted/30 rounded-r-lg border-l-2 p-3 text-sm",
        className
      )}
    >
      <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
        <span className="font-medium">Quote from @{username}</span>
        {createdAt ? (
          <>
            <span>&middot;</span>
            <DateTime date={createdAt} relative short />
          </>
        ) : null}
      </div>

      {children ? <div className="mb-2">{children}</div> : null}

      <p
        className={cn(
          "text-foreground/80 font-content line-clamp-4 whitespace-pre-wrap",
          textClassName
        )}
      >
        <LinkifiedText text={text} />
      </p>
    </div>
  );
}
