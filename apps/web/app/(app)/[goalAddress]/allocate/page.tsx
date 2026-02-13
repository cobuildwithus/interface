import type { Metadata } from "next";
import { getUser } from "@/lib/domains/auth/session";
import { getAllocateIntroDismissed } from "@/lib/domains/goals/allocate-intro";
import { AllocatePageClient } from "./allocate-page-client";
import { generateGoalMetadata } from "../metadata";

export async function generateMetadata(): Promise<Metadata> {
  return generateGoalMetadata({
    pageName: "Allocate",
    description:
      "Manage your stake allocations and let your agent optimize funding across subgoals.",
    pathSuffix: "/allocate",
  });
}

export default async function AllocatePage({
  params,
}: {
  params: Promise<{ goalAddress: string }>;
}) {
  const { goalAddress } = await params;
  const userAddress = await getUser();
  const dismissed = userAddress ? await getAllocateIntroDismissed(userAddress, goalAddress) : false;

  return (
    <AllocatePageClient
      goalAddress={goalAddress}
      initialShowHowItWorks={!dismissed}
      canPersistIntroDismissal={Boolean(userAddress)}
    />
  );
}
