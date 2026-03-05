import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/domains/auth/session";
import {
  getGoalMilestones,
  getGoalOverviewData,
  getGoalTreasuryChartData,
} from "@/lib/domains/goals/goal-data";
import { getGoalActionCardReadIndices } from "@/lib/domains/goals/action-card-read";
import { GoalProgressCard } from "@/components/features/goals/goal-progress-card";
import { GoalTreasuryCard } from "@/components/features/goals/goal-treasury-card";
import { GoalAiInput } from "@/components/features/goals/goal-ai-input";
import { GoalActionCards } from "@/components/features/goals/goal-action-cards";
import { markGoalActionCardRead } from "./actions";
import { generateGoalMetadata } from "./metadata";
import { GoalPageLayout } from "./components/goal-page-layout";
import { SidebarSkeleton } from "./components/sidebar-skeleton";
import { GoalMilestones } from "./components/goal-milestones";
import { RecentDiscussions } from "./components/recent-discussions";
import { RecentContributions } from "./components/recent-contributions";

type MetadataProps = {
  params: Promise<{ goalAddress: string }>;
};

type PageProps = {
  params: Promise<{ goalAddress: string }>;
};

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { goalAddress } = await params;
  return generateGoalMetadata({ goalAddress });
}

async function getGoalActionCardReadState(goalAddress: string): Promise<{
  initialDismissedCardIndices: number[];
  persistCardReadAction?: (cardIndex: number) => Promise<boolean>;
}> {
  const userAddress = await getUser();
  if (!userAddress) {
    return { initialDismissedCardIndices: [] };
  }

  return {
    initialDismissedCardIndices: await getGoalActionCardReadIndices(userAddress, goalAddress),
    persistCardReadAction: markGoalActionCardRead.bind(null, goalAddress),
  };
}

export default async function GoalPage({ params }: PageProps) {
  const { goalAddress } = await params;
  const overview = await getGoalOverviewData(goalAddress);
  if (!overview) notFound();
  const { initialDismissedCardIndices, persistCardReadAction } =
    await getGoalActionCardReadState(goalAddress);

  return (
    <GoalPageLayout
      sidebar={
        <>
          <GoalProgressCard
            title={overview.progressTitle}
            raised={overview.raised}
            goal={overview.target}
          />

          <section>
            <h2 className="text-muted-foreground mb-3 text-sm font-medium">Recent Discussions</h2>
            <Suspense fallback={<SidebarSkeleton />}>
              <RecentDiscussions goalScope={overview.goalScope} />
            </Suspense>
          </section>

          <section>
            <h2 className="text-muted-foreground mb-3 text-sm font-medium">Treasury</h2>
            <Suspense fallback={<SidebarSkeleton />}>
              <GoalTreasurySection goalAddress={goalAddress} />
            </Suspense>
          </section>

          <section>
            <h2 className="text-muted-foreground mb-3 text-sm font-medium">Recent Contributions</h2>
            <Suspense fallback={<SidebarSkeleton />}>
              <RecentContributions goalAddress={goalAddress} />
            </Suspense>
          </section>
        </>
      }
    >
      <div className="space-y-24">
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
          <div className="w-full max-w-3xl">
            <div className="mb-6">
              <GoalActionCards
                goalAddress={goalAddress}
                initialDismissedCardIndices={initialDismissedCardIndices}
                persistCardReadAction={persistCardReadAction}
              />
            </div>
            <div className="mx-auto max-w-2xl">
              <GoalAiInput goalAddress={goalAddress} />
            </div>
          </div>
        </div>

        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
          <div className="w-full max-w-2xl">
            <Suspense fallback={<SidebarSkeleton />}>
              <GoalMilestonesSection goalAddress={goalAddress} />
            </Suspense>
          </div>
        </div>
      </div>
    </GoalPageLayout>
  );
}

async function GoalTreasurySection({ goalAddress }: { goalAddress: string }) {
  const chartData = await getGoalTreasuryChartData(goalAddress);
  return <GoalTreasuryCard points={chartData?.points ?? []} />;
}

async function GoalMilestonesSection({ goalAddress }: { goalAddress: string }) {
  const milestones = await getGoalMilestones(goalAddress);
  return <GoalMilestones milestones={milestones} />;
}
