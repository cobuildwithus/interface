"use client";

import { useEffect, useState, useTransition } from "react";
import type { ProtocolRouteHint as ProtocolRouteHintData } from "@cobuild/wire/protocol-notifications";
import { useRouter } from "next/navigation";
import { ProtocolRouteHint } from "@/components/features/notifications/protocol-route-hint";
import { dismissAllocateHowItWorks } from "./actions";
import { ActivityFeed } from "./components/activity-feed";
import { AllocateHeader } from "./components/allocate-header";
import { FundingFlow } from "./components/funding-flow";
import { HowThisWorksCard } from "./components/how-this-works-card";
import { PositionSummary } from "./components/position-summary";
import { StakeAllocations } from "./components/stake-allocations";
import type { AgentActivity, AgentAllocation, SGSummary } from "./components/types";

type AllocatePageClientProps = {
  goalAddress: string;
  goalTitle: string;
  systemStats: {
    totalFunding: number;
    dailyFlow: number;
    rewardsLocked: number;
  };
  userStats: {
    staked: number;
    projectedReward: number;
  };
  agentAllocations: AgentAllocation[];
  recentActivity: AgentActivity[];
  initialSubGoals: SGSummary[];
  initialShowHowItWorks: boolean;
  canPersistIntroDismissal: boolean;
  routeHint: ProtocolRouteHintData | null;
  initialFocusSectionId: "position-summary" | "funding-flow" | null;
};

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
  goalTitle,
  systemStats,
  userStats,
  agentAllocations,
  recentActivity,
  initialSubGoals,
  initialShowHowItWorks,
  canPersistIntroDismissal,
  routeHint,
  initialFocusSectionId,
}: AllocatePageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isHowItWorksVisible, setIsHowItWorksVisible] = useState(initialShowHowItWorks);
  const [subGoals, setSubGoals] = useState(initialSubGoals);
  const baseTreasuryBalance = Math.max(
    systemStats.totalFunding,
    initialSubGoals.reduce((total, subGoal) => total + subGoal.currentFunding, 0)
  );
  const allocatedFunding = subGoals.reduce((total, subGoal) => total + subGoal.currentFunding, 0);
  const treasuryBalance = Math.max(0, baseTreasuryBalance - allocatedFunding);

  useEffect(() => {
    const interval = setInterval(() => {
      setSubGoals((prev) => applyFundingFlow(prev));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!initialFocusSectionId) return;

    const element = document.getElementById(initialFocusSectionId);
    if (!element) return;
    element.scrollIntoView({ block: "start" });
  }, [initialFocusSectionId]);

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
        {routeHint ? <ProtocolRouteHint hint={routeHint} /> : null}
        <HowThisWorksCard
          isVisible={isHowItWorksVisible}
          isPending={isPending}
          onDismiss={handleDismissHowItWorks}
        />
        <AllocateHeader goalTitle={goalTitle} systemStats={systemStats} />
        <div id="position-summary">
          <PositionSummary userStats={userStats} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-8">
            <StakeAllocations allocations={agentAllocations} />
          </div>
          <ActivityFeed recentActivity={recentActivity} />
        </div>

        <div id="funding-flow">
          <FundingFlow
            subGoals={subGoals}
            treasuryBalance={treasuryBalance}
            systemStats={systemStats}
          />
        </div>
      </div>
    </main>
  );
}
