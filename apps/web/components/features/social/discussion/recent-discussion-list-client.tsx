"use client";

import Link from "next/link";
import { DateTime } from "@/components/ui/date-time";
import type { DiscussionCastListItem } from "@/lib/integrations/farcaster/casts/types";
import { cn } from "@/lib/shared/utils";

type RecentDiscussionListClientProps = {
  items: DiscussionCastListItem[];
};

export function RecentDiscussionListClient({ items }: RecentDiscussionListClientProps) {
  return (
    <div className="divide-border divide-y">
      {items.map((cast) => {
        const lastReplyDate = cast.lastReply ? new Date(cast.lastReply.createdAt) : null;
        const titleWeight =
          cast.isRead === undefined ? "font-medium" : cast.isRead ? "font-normal" : "font-bold";

        return (
          <Link
            key={cast.hash}
            href={`/cast/${cast.hash}`}
            className="hover:bg-muted/50 block py-2 transition-colors"
          >
            <div className={cn("truncate text-sm", titleWeight)}>{cast.title}</div>
            <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
              {lastReplyDate && cast.lastReply && (
                <>
                  <span>{cast.lastReply.authorUsername}</span>
                  <span>·</span>
                  <DateTime date={lastReplyDate} relative short />
                </>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
