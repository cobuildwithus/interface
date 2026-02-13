import { Suspense } from "react";
import type { Metadata } from "next";
import { RAISE_1M_GOAL_SCOPE } from "@/lib/domains/goals/goal-scopes";
import { RAISE_1M_GOAL, RAISE_1M_RAISED } from "@/lib/domains/goals/raise-1m";
import { getUser } from "@/lib/domains/auth/session";
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

export async function generateMetadata(): Promise<Metadata> {
  return generateGoalMetadata();
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

export default async function Raise1MilPage({
  params,
}: {
  params: Promise<{ goalAddress: string }>;
}) {
  const { goalAddress } = await params;
  const { initialDismissedCardIndices, persistCardReadAction } =
    await getGoalActionCardReadState(goalAddress);

  return (
    <GoalPageLayout
      sidebar={
        <>
          <GoalProgressCard
            title="Raise $1M by Jun 30, 2026"
            raised={RAISE_1M_RAISED}
            goal={RAISE_1M_GOAL}
          />

          <section>
            <h2 className="text-muted-foreground mb-3 text-sm font-medium">Recent Discussions</h2>
            <Suspense fallback={<SidebarSkeleton />}>
              <RecentDiscussions goalScope={RAISE_1M_GOAL_SCOPE} />
            </Suspense>
          </section>

          <section>
            <h2 className="text-muted-foreground mb-3 text-sm font-medium">Treasury</h2>
            <GoalTreasuryCard />
          </section>

          <section>
            <h2 className="text-muted-foreground mb-3 text-sm font-medium">Recent Contributions</h2>
            <Suspense fallback={<SidebarSkeleton />}>
              <RecentContributions />
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
            <GoalMilestones />
          </div>
        </div>
      </div>
    </GoalPageLayout>
  );
}
