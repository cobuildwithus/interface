"use client";

import { Avatar } from "@/components/ui/avatar";
import { DateTime } from "@/components/ui/date-time";
import { getFarcasterProfileUrl } from "@/lib/integrations/farcaster/urls";
import type { ThreadCast } from "@/lib/integrations/farcaster/casts/types";

type QuotedCastPreviewProps = {
  cast: ThreadCast;
};

export function QuotedCastPreview({ cast }: QuotedCastPreviewProps) {
  const username = cast.author.username ?? "unknown";
  const createdAt = new Date(cast.createdAt);
  const profileUrl = cast.author.username ? getFarcasterProfileUrl(cast.author.username) : null;

  return (
    <div className="border-muted-foreground/30 bg-muted/30 rounded-r-lg border-l-2 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Avatar
          src={cast.author.pfp_url}
          alt={username}
          fallback={username.slice(0, 2).toUpperCase()}
          size={20}
        />
        <div className="flex items-center gap-1.5 text-xs">
          {profileUrl ? (
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground font-medium hover:underline"
            >
              {username}
            </a>
          ) : (
            <span className="text-foreground font-medium">{username}</span>
          )}
          <span className="text-muted-foreground">&middot;</span>
          <DateTime date={createdAt} relative short className="text-muted-foreground" />
        </div>
      </div>
      <p className="font-content text-foreground/80 line-clamp-3 text-sm whitespace-pre-wrap">
        {cast.text}
      </p>
    </div>
  );
}
