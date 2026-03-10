import type { Metadata } from "next";
import {
  buildProtocolRouteHint,
  resolveProtocolRouteState,
} from "@cobuild/wire/protocol-notifications";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/domains/auth/session";
import { getAllocateIntroDismissed } from "@/lib/domains/goals/allocate-intro";
import { getGoalAllocateData } from "@/lib/domains/goals/goal-data";
import { AllocatePageClient } from "./allocate-page-client";
import { generateGoalMetadata } from "../metadata";

type MetadataProps = {
  params: Promise<{ goalAddress: string }>;
};

type PageProps = {
  params: Promise<{ goalAddress: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { goalAddress } = await params;
  return generateGoalMetadata({
    goalAddress,
    pageName: "Allocate",
    description:
      "Manage your stake allocations and let your agent optimize funding across subgoals.",
    pathSuffix: "/allocate",
  });
}

export default async function AllocatePage({ params, searchParams }: PageProps) {
  const { goalAddress } = await params;
  const routeHint = buildProtocolRouteHint(
    "allocate",
    resolveProtocolRouteState(await searchParams)
  );
  const userAddress = await getUser();
  const [dismissed, allocateData] = await Promise.all([
    userAddress ? getAllocateIntroDismissed(userAddress, goalAddress) : Promise.resolve(false),
    getGoalAllocateData(goalAddress, userAddress ?? null),
  ]);
  if (!allocateData) notFound();

  return (
    <AllocatePageClient
      goalAddress={goalAddress}
      goalTitle={allocateData.goalTitle}
      systemStats={allocateData.systemStats}
      userStats={allocateData.userStats}
      agentAllocations={allocateData.agentAllocations}
      recentActivity={allocateData.recentActivity}
      initialSubGoals={allocateData.subGoals}
      initialShowHowItWorks={!dismissed}
      canPersistIntroDismissal={Boolean(userAddress)}
      routeHint={routeHint}
      initialFocusSectionId={routeHint?.focusSectionId ?? null}
    />
  );
}
