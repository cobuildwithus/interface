import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { RankBadges } from "@/components/common/rank-badges";
import { getSession } from "@/lib/domains/auth/session";
import { computeRankTier } from "@/lib/domains/profile/rank";
import { getCobuildActivityByFid } from "@/lib/integrations/farcaster/activity";
import { getFarcasterProfileUrl } from "@/lib/integrations/farcaster/urls";

export async function ProfileHeader() {
  const session = await getSession();

  const fid = session.farcaster?.fid;
  const neynarScore = session.farcaster?.neynarScore ?? 0;
  const activityStats = fid ? await getCobuildActivityByFid(fid) : { activity: 0, posts: 0 };
  const rankTier = computeRankTier(activityStats.activity, neynarScore);

  const username = session.farcaster?.username || session.twitter?.username || "Anonymous";
  const displayName = session.farcaster?.displayName || session.twitter?.name || "";
  const avatar = session.farcaster?.pfp || session.twitter?.profilePictureUrl || null;
  const bio = session.farcaster?.bio;
  const farcasterProfileUrl = session.farcaster?.username
    ? getFarcasterProfileUrl(session.farcaster.username)
    : null;

  const profileLink = farcasterProfileUrl
    ? { href: farcasterProfileUrl, target: "_blank" as const, rel: "noopener noreferrer" }
    : null;

  return (
    <div className="mb-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {profileLink ? (
          <Link {...profileLink} className="shrink-0">
            <Avatar src={avatar} size={80} fallback={username || "?"} />
          </Link>
        ) : (
          <Avatar src={avatar} size={80} fallback={username || "?"} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              {profileLink ? (
                <Link {...profileLink} className="hover:underline">
                  <h2 className="text-xl font-medium">{username}</h2>
                </Link>
              ) : (
                <h2 className="text-xl font-medium">{username}</h2>
              )}
              {displayName && <p className="text-muted-foreground text-sm">{displayName}</p>}
            </div>
            <RankBadges tier={rankTier} />
          </div>
          {bio && <p className="text-muted-foreground mt-2 line-clamp-2 max-w-lg text-sm">{bio}</p>}
        </div>
      </div>
    </div>
  );
}
