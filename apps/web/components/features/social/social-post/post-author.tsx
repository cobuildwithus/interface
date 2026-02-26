"use client";

import { ExternalLink, MoreHorizontal } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { DateTime } from "@/components/ui/date-time";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PostAuthorProps = {
  displayName: string;
  handle: string;
  avatarUrl?: string | null;
  profileUrl: string;
  postUrl?: string | null;
  createdAt?: Date | null;
  viewPostLabel?: string;
  dropdownContent?: React.ReactNode;
};

export function PostAuthor({
  displayName,
  handle,
  avatarUrl,
  profileUrl,
  postUrl,
  createdAt,
  viewPostLabel = "View post",
  dropdownContent,
}: PostAuthorProps) {
  const fallback = (handle || displayName).slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-row items-center gap-3">
      <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
        <Avatar size={40} src={avatarUrl} alt={displayName} fallback={fallback} />
      </a>
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <div className="flex items-baseline gap-2 leading-none">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground font-content truncate text-base leading-tight font-bold hover:underline"
          >
            {displayName}
          </a>
          {createdAt && (
            <DateTime
              date={createdAt}
              relative
              short
              className="text-muted-foreground shrink-0 text-sm leading-tight whitespace-nowrap"
            />
          )}
        </div>
        {handle && (
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground w-fit text-sm leading-tight hover:underline"
          >
            @{handle}
          </a>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground shrink-0 hover:bg-transparent"
          >
            <MoreHorizontal size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {postUrl && (
            <DropdownMenuItem asChild>
              <a href={postUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} className="mr-2" />
                {viewPostLabel}
              </a>
            </DropdownMenuItem>
          )}
          {dropdownContent}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
