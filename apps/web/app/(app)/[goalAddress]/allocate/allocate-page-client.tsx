"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dismissAllocateHowItWorks } from "./actions";
import { ActivityFeed } from "./components/activity-feed";
import { AllocateHeader } from "./components/allocate-header";
import { FundingFlow } from "./components/funding-flow";
import { HowThisWorksCard } from "./components/how-this-works-card";
import { PositionSummary } from "./components/position-summary";
import { StakeAllocations } from "./components/stake-allocations";
import {
  agentAllocations,
  goalTitle,
  initialSubGoals,
  recentActivity,
  systemStats,
  userStats,
} from "./components/data";
import type { SGSummary } from "./components/types";

type AllocatePageClientProps = {
  goalAddress: string;
  initialShowHowItWorks: boolean;
  canPersistIntroDismissal: boolean;
};

const baseTreasuryBalance =
  systemStats.totalFunding +
  initialSubGoals.reduce((total, subGoal) => total + subGoal.currentFunding, 0);

function applyFundingFlow(goals: SGSummary[]) {
  return goals.map((sg) => {
    if (sg.flowRate === 0) return sg;
    if (sg.maxBudget && sg.currentFunding >= sg.maxBudget) return sg;

    const newFunding = sg.currentFunding + sg.flowRate;
    const cappedFunding = sg.maxBudget ? Math.min(newFunding, sg.maxBudget) : newFunding;
    return { ...sg, currentFunding: cappedFunding };
  });
}

export function AllocatePageClient({
  goalAddress,
  initialShowHowItWorks,
  canPersistIntroDismissal,
}: AllocatePageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isHowItWorksVisible, setIsHowItWorksVisible] = useState(initialShowHowItWorks);
  const [subGoals, setSubGoals] = useState(initialSubGoals);
  const allocatedFunding = subGoals.reduce((total, subGoal) => total + subGoal.currentFunding, 0);
  const treasuryBalance = Math.max(0, baseTreasuryBalance - allocatedFunding);

  useEffect(() => {
    const interval = setInterval(() => {
      setSubGoals((prev) => applyFundingFlow(prev));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDismissHowItWorks = () => {
    setIsHowItWorksVisible(false);

    if (!canPersistIntroDismissal) return;

    startTransition(async () => {
      const persisted = await dismissAllocateHowItWorks(goalAddress);
      if (persisted) {
        router.refresh();
      }
    });
  };

  return (
    <main className="relative min-h-screen w-full">
      <div className="w-full p-4 md:p-6 lg:p-8">
        <HowThisWorksCard
          isVisible={isHowItWorksVisible}
          isPending={isPending}
          onDismiss={handleDismissHowItWorks}
        />
        <AllocateHeader goalTitle={goalTitle} systemStats={systemStats} />
        <PositionSummary userStats={userStats} />

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-8">
            <StakeAllocations allocations={agentAllocations} />
          </div>
          <ActivityFeed recentActivity={recentActivity} />
        </div>

        <FundingFlow
          subGoals={subGoals}
          treasuryBalance={treasuryBalance}
          systemStats={systemStats}
        />
      </div>
    </main>
  );
}
