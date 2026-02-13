import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getUniqueMemberCount } from "@/lib/domains/token/juicebox/member-count";
import { MillionMemberGoalProgress } from "@/components/features/goals/million-member-goal-client";

const GOAL = 1_000_000;

async function MilestoneContent() {
  const count = await getUniqueMemberCount();

  return <MillionMemberGoalProgress count={count} goal={GOAL} />;
}

function MilestoneSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-full rounded-full" />
      <div className="flex items-baseline gap-1.5">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

export function MillionMemberGoal() {
  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="mb-3">
        <h2 className="font-semibold">The world&apos;s first million-member org managed by AI</h2>
      </div>

      <Suspense fallback={<MilestoneSkeleton />}>
        <MilestoneContent />
      </Suspense>
    </div>
  );
}
