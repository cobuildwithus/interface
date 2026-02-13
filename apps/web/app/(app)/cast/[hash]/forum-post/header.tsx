import Link from "next/link";
import {
  ExternalLink,
  EyeOff,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  UserX,
} from "lucide-react";
import { DateTime } from "@/components/ui/date-time";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ThreadCast } from "@/lib/integrations/farcaster/casts/types";
import { cn } from "@/lib/shared/utils";

type ForumPostHeaderProps = {
  cast: ThreadCast;
  createdAt: Date;
  isRoot?: boolean;
  isFocused?: boolean;
  isHiddenRoot: boolean;
  viewLabel: string;
  isAuthor: boolean;
  isAdmin: boolean;
  postNumber: number;
  postPermalink: string;
  castUrl: string;
  onReply?: (cast: ThreadCast) => void;
  onCopyLink: () => void;
  onDelete: () => void;
  onModerateCast: () => void;
  onModerateUser: () => void;
  isDeleting: boolean;
};

export function ForumPostHeader({
  cast,
  createdAt,
  isRoot,
  isFocused,
  isHiddenRoot,
  viewLabel,
  isAuthor,
  isAdmin,
  postNumber,
  postPermalink,
  castUrl,
  onReply,
  onCopyLink,
  onDelete,
  onModerateCast,
  onModerateUser,
  isDeleting,
}: ForumPostHeaderProps) {
  return (
    <div
      className={cn(
        "border-border/60 bg-muted/40 flex items-center justify-between border-b px-4 py-2",
        isFocused ? "bg-primary/10 border-primary/30" : null
      )}
    >
      <div className="flex flex-col gap-2">
        {isHiddenRoot && (
          <div className="border-destructive/20 bg-destructive/5 flex flex-wrap items-center gap-2 rounded-full border px-3 py-1.5 text-xs">
            <span className="border-destructive/30 bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.2em] uppercase">
              <EyeOff size={12} />
              Hidden
            </span>
            <span className="text-foreground/70">
              {cast.hiddenReason ? (
                <>
                  Reason:{" "}
                  <span className="text-foreground/90 font-medium">{cast.hiddenReason}</span>
                </>
              ) : (
                "Hidden by moderators."
              )}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <DateTime date={createdAt} className="text-muted-foreground text-xs" />
          {isRoot && (
            <span className="text-muted-foreground text-xs">
              Read {cast.viewCount.toLocaleString()} {viewLabel}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onReply?.(cast)}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
        >
          <MessageSquare size={12} />
          <span>Reply</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md p-1 transition-colors"
            >
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onCopyLink}>
              <Link2 size={14} className="mr-2" />
              Copy link to this post
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={castUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} className="mr-2" />
                View on Farcaster
              </a>
            </DropdownMenuItem>
            {isAuthor || isAdmin ? <DropdownMenuSeparator /> : null}
            {isAuthor ? (
              <DropdownMenuItem
                variant="destructive"
                disabled={isDeleting}
                onSelect={(event) => {
                  event.preventDefault();
                  onDelete();
                }}
              >
                <Trash2 size={14} />
                Delete post
              </DropdownMenuItem>
            ) : null}
            {isAdmin ? (
              <>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(event) => {
                    event.preventDefault();
                    onModerateCast();
                  }}
                >
                  <EyeOff size={14} />
                  Hide cast from channel
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(event) => {
                    event.preventDefault();
                    onModerateUser();
                  }}
                >
                  <UserX size={14} />
                  Hide user from channel
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        <Link
          href={postPermalink}
          className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
        >
          #{postNumber}
        </Link>
      </div>
    </div>
  );
}
