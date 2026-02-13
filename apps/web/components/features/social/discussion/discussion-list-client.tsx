"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DateTime } from "@/components/ui/date-time";
import { PaginationNav, buildPaginationHref } from "@/components/ui/pagination";
import { TopicTitle } from "@/components/features/social/discussion/topic-title";
import type {
  DiscussionCastListItem,
  DiscussionSort,
  DiscussionSortDirection,
} from "@/lib/integrations/farcaster/casts/types";
import { cn } from "@/lib/shared/utils";

type DiscussionListClientProps = {
  items: DiscussionCastListItem[];
  page: number;
  totalPages: number;
  sort: DiscussionSort;
  sortDirection: DiscussionSortDirection;
  createPostHref: string;
};

function getNextSortDirection(
  currentSort: DiscussionSort,
  currentDirection: DiscussionSortDirection,
  nextSort: DiscussionSort
): DiscussionSortDirection {
  if (currentSort !== nextSort) return "desc";
  return currentDirection === "asc" ? "desc" : "asc";
}

type SortableHeaderProps = {
  label: string;
  sortKey: DiscussionSort;
  sort: DiscussionSort;
  sortDirection: DiscussionSortDirection;
  className?: string;
};

function SortableHeader({ label, sortKey, sort, sortDirection, className }: SortableHeaderProps) {
  const pathname = usePathname();
  const isActive = sort === sortKey;
  const nextDirection = getNextSortDirection(sort, sortDirection, sortKey);
  const href = buildPaginationHref(pathname, {
    sort: sortKey,
    dir: nextDirection,
  });
  const indicator = isActive ? (sortDirection === "asc" ? "↑" : "↓") : null;
  const stateLabel = isActive ? `${label} (${sortDirection})` : label;

  return (
    <Link
      href={href}
      className={cn(
        "text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium transition-colors",
        className
      )}
      aria-label={`Sort by ${stateLabel}`}
      title={`Sort by ${stateLabel}`}
    >
      <span>{label}</span>
      {indicator ? <span className="text-muted-foreground text-[10px]">{indicator}</span> : null}
    </Link>
  );
}

export function DiscussionListClient({
  items,
  page,
  totalPages,
  sort,
  sortDirection,
  createPostHref,
}: DiscussionListClientProps) {
  const showPagination = totalPages > 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {showPagination ? (
          <PaginationNav
            page={page}
            totalPages={totalPages}
            params={{ sort, dir: sortDirection }}
          />
        ) : (
          <div />
        )}
        <Button asChild size="sm">
          <Link href={createPostHref}>
            <Plus className="h-4 w-4" />
            Post
          </Link>
        </Button>
      </div>
      <div className="border-border divide-border bg-card divide-y overflow-hidden rounded-2xl border shadow-sm">
        {/* Column headers - hidden on mobile */}
        <div className="bg-muted/50 hidden items-center gap-4 px-6 py-2 md:flex">
          <div className="min-w-0 flex-1">
            <span className="text-muted-foreground text-xs font-medium">Topic</span>
          </div>
          <div className="flex shrink-0 items-center gap-6 text-center">
            <div className="text-muted-foreground w-40 text-left text-xs font-medium">
              Started by
            </div>
            <SortableHeader
              label="Replies"
              sortKey="replies"
              sort={sort}
              sortDirection={sortDirection}
              className="w-14 justify-center"
            />
            <SortableHeader
              label="Views"
              sortKey="views"
              sort={sort}
              sortDirection={sortDirection}
              className="w-14 justify-center"
            />
            <SortableHeader
              label="Last Post"
              sortKey="last"
              sort={sort}
              sortDirection={sortDirection}
              className="w-28 justify-end"
            />
          </div>
        </div>
        {items.map((cast) => (
          <DiscussionListItem key={cast.hash} cast={cast} />
        ))}
      </div>
      {showPagination && (
        <div className="flex justify-end pt-2">
          <PaginationNav
            page={page}
            totalPages={totalPages}
            params={{ sort, dir: sortDirection }}
          />
        </div>
      )}
    </div>
  );
}

type DiscussionListItemProps = {
  cast: DiscussionCastListItem;
};

function DiscussionListItem({ cast }: DiscussionListItemProps) {
  const authorName = cast.author.username ?? "Unknown";
  const lastReplyDate = cast.lastReply ? new Date(cast.lastReply.createdAt) : null;
  const titleWeight =
    cast.isRead === undefined ? "font-medium" : cast.isRead ? "font-normal" : "font-bold";

  return (
    <Link
      href={`/cast/${cast.hash}`}
      className={cn(
        "group flex items-center gap-4 px-6 py-4 transition-colors",
        "hover:bg-accent/50"
      )}
    >
      {/* Topic */}
      <div className="min-w-0 flex-1">
        <TopicTitle
          as="h3"
          text={cast.title}
          className={cn(
            "text-foreground max-w-[600px] truncate text-base leading-snug",
            titleWeight
          )}
        />
        {/* Mobile stats - shown under title on mobile only */}
        <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs md:hidden">
          <span>{cast.viewCount.toLocaleString()} views</span>
          <span>{cast.replyCount} replies</span>
          {lastReplyDate && (
            <span>
              last <DateTime date={lastReplyDate} relative short />
            </span>
          )}
        </div>
      </div>

      {/* Stats columns - hidden on mobile */}
      <div className="hidden shrink-0 items-center gap-6 text-center md:flex">
        <div className="flex w-40 items-center gap-1.5">
          <Avatar
            size={18}
            src={cast.author.pfp_url ?? undefined}
            alt={authorName}
            fallback={authorName.slice(0, 2).toUpperCase()}
          />
          <span className="text-muted-foreground truncate text-sm">{authorName}</span>
        </div>
        <div className="text-foreground w-14 text-sm">{cast.replyCount}</div>
        <div className="text-foreground w-14 text-sm">{cast.viewCount.toLocaleString()}</div>
        <div className="w-28 text-right">
          {lastReplyDate ? (
            <>
              <DateTime
                date={lastReplyDate}
                relative
                short
                className="text-muted-foreground text-xs"
              />
              <div className="text-muted-foreground truncate text-[10px]">
                {cast.lastReply?.authorUsername}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </div>
      </div>
    </Link>
  );
}
