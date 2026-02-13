import { Suspense } from "react";
import { getSession } from "@/lib/domains/auth/session";
import { getTopicsViewedCount } from "@/lib/domains/social/cast-read/kv";
import {
  getProfileStatsByFid,
  type ProfileStats as ProfileStatsData,
} from "@/lib/integrations/farcaster/casts/profile-topics";
import { getCobuildActivityByFid } from "@/lib/integrations/farcaster/activity";
import { ProfileStatItemSkeleton } from "@/components/common/skeletons/profile-stats-skeleton";
import { pluralize } from "@/lib/shared/text/pluralize";

const EMPTY_PROFILE_STATS: ProfileStatsData = {
  topicsCreated: 0,
  postsCreated: 0,
  totalViews: 0,
};

export async function ProfileStats() {
  const session = await getSession();

  const fid = session.farcaster?.fid ?? null;
  const address = session.address ?? null;
  const profileStatsPromise = fid
    ? getProfileStatsByFid(fid)
    : Promise.resolve(EMPTY_PROFILE_STATS);

  return (
    <div className="border-border grid grid-cols-3 gap-4 border-b py-3 md:flex md:items-center md:gap-x-10">
      <Suspense fallback={<ProfileStatItemSkeleton />}>
        <ActivityStat fid={fid} />
      </Suspense>
      <Suspense fallback={<ProfileStatItemSkeleton />}>
        <TopicsStat statsPromise={profileStatsPromise} />
      </Suspense>
      <Suspense fallback={<ProfileStatItemSkeleton />}>
        <PostsStat statsPromise={profileStatsPromise} />
      </Suspense>
      <Suspense fallback={<ProfileStatItemSkeleton />}>
        <ViewsStat statsPromise={profileStatsPromise} />
      </Suspense>
      <Suspense fallback={<ProfileStatItemSkeleton />}>
        <TopicsViewedStat address={address} />
      </Suspense>
    </div>
  );
}

async function ActivityStat({ fid }: { fid: number | null }) {
  const stats = fid ? await getCobuildActivityByFid(fid) : { activity: 0, posts: 0 };
  return <StatItem value={stats.activity} label="activity" />;
}

async function TopicsStat({ statsPromise }: { statsPromise: Promise<ProfileStatsData> }) {
  const stats = await statsPromise;
  return <StatItem value={stats.topicsCreated} label="topics" />;
}

async function PostsStat({ statsPromise }: { statsPromise: Promise<ProfileStatsData> }) {
  const stats = await statsPromise;
  return <StatItem value={stats.postsCreated} label="posts" />;
}

async function ViewsStat({ statsPromise }: { statsPromise: Promise<ProfileStatsData> }) {
  const stats = await statsPromise;
  return <StatItem value={stats.totalViews} label="views" />;
}

async function TopicsViewedStat({ address }: { address: string | null }) {
  const topicsViewed = address ? await getTopicsViewedCount(address) : 0;
  return <StatItem value={topicsViewed} label={`${pluralize(topicsViewed, "topic")} viewed`} />;
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center md:text-left">
      <div className="text-lg font-semibold tabular-nums md:inline">{value.toLocaleString()}</div>
      <div className="text-muted-foreground text-sm md:ml-1 md:inline">{label}</div>
    </div>
  );
}
