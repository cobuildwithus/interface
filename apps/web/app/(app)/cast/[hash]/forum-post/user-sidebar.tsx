"use client";

import { Avatar } from "@/components/ui/avatar";
import type { ThreadCast } from "@/lib/integrations/farcaster/casts/types";
import { getFarcasterProfileUrl } from "@/lib/integrations/farcaster/urls";
import { UserRankBadge } from "../user-rank-badge";

export function UserSidebar({ cast }: { cast: ThreadCast }) {
  const username = cast.author.username ?? "unknown";
  const profileUrl = cast.author.username ? getFarcasterProfileUrl(cast.author.username) : null;

  const avatarElement = (
    <Avatar
      src={cast.author.pfp_url}
      alt={username}
      fallback={username.slice(0, 2).toUpperCase()}
      size={64}
      square
    />
  );

  return (
    <div className="flex flex-row items-center gap-3 md:flex-col md:items-start md:gap-0">
      {/* Square avatar - at top on desktop, left side on mobile */}
      <div className="shrink-0">
        {profileUrl ? (
          <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="block">
            {avatarElement}
          </a>
        ) : (
          avatarElement
        )}
      </div>

      {/* Username */}
      <div className="min-w-0 md:mt-2">
        {profileUrl ? (
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground block truncate text-sm font-semibold hover:underline"
          >
            {username}
          </a>
        ) : (
          <span className="text-foreground block truncate text-sm font-semibold">{username}</span>
        )}
      </div>

      {/* Member status & Activity - hidden on mobile */}
      <div className="hidden md:mt-0.5 md:block">
        <UserRankBadge
          neynarScore={cast.author.neynar_score}
          activity={cast.author.activity}
          posts={cast.author.activity_posts}
        />
      </div>
    </div>
  );
}
