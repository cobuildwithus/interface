import { Suspense } from "react";
import type { Metadata } from "next";
import { getSession } from "@/lib/domains/auth/session";
import { ProfileHeader } from "./profile-header";
import { ProfileStats } from "./profile-stats";
import { ProfileTabs } from "./profile-tabs";
import { RecentActivitySection } from "./recent-activity-section";
import { HoldingsSection } from "./holdings-section";
import { TokenBalanceCard } from "./token-balance-card";
import { ProfileListSkeleton } from "@/components/common/skeletons/profile-list-skeleton";
import { ProfileRecentActivitySkeleton } from "@/components/common/skeletons/profile-recent-activity-skeleton";
import { ProfileStatsSkeleton } from "@/components/common/skeletons/profile-stats-skeleton";
import { ProfileActivitySection } from "@/components/features/social/discussion/profile-activity-section";

export async function generateMetadata(): Promise<Metadata> {
  const session = await getSession();
  const username = session.farcaster?.username || session.twitter?.username || "Profile";

  return {
    title: `${username} | Cobuild`,
  };
}

type ProfilePageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const activityFallback = (
    <div className="grid gap-6 lg:grid-cols-2">
      <ProfileListSkeleton />
      <ProfileListSkeleton />
    </div>
  );

  const { tab } = await searchParams;
  const tabParam = Array.isArray(tab) ? tab[0] : tab;
  const activeTab = tabParam === "conversation" ? "conversation" : "activity";

  return (
    <main className="w-full p-4 md:p-6">
      <ProfileHeader />

      <ProfileTabs
        activeTab={activeTab}
        statsContent={
          <Suspense fallback={<ProfileStatsSkeleton />}>
            <ProfileStats />
          </Suspense>
        }
        conversationContent={
          <Suspense fallback={activityFallback}>
            <ProfileActivitySection />
          </Suspense>
        }
        activityContent={
          <Suspense fallback={<ProfileRecentActivitySkeleton />}>
            <RecentActivitySection />
          </Suspense>
        }
        holdingsContent={
          <div className="space-y-4">
            <TokenBalanceCard />
            <HoldingsSection />
          </div>
        }
      />
    </main>
  );
}
