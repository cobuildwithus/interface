import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GoalChatsSkeleton } from "@/components/common/skeletons/goal-chats-skeleton";
import { GridBackground } from "@/components/ui/grid-background";
import { getGoalOverviewData } from "@/lib/domains/goals/goal-data";
import { generateGoalMetadata } from "../metadata";
import { GoalChatsSection } from "./goal-chats-section";

type MetadataProps = {
  params: Promise<{ goalAddress: string }>;
};

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { goalAddress } = await params;
  return generateGoalMetadata({
    goalAddress,
    pageName: "Chats",
    description: "Keep track of conversations about this goal.",
    pathSuffix: "/chats",
  });
}

type PageProps = {
  params: Promise<{ goalAddress: string }>;
};

export default async function GoalChatsPage({ params }: PageProps) {
  const { goalAddress } = await params;
  const overview = await getGoalOverviewData(goalAddress);
  if (!overview) notFound();

  return (
    <main className="relative min-h-screen w-full">
      <GridBackground />
      <div className="relative w-full p-4 md:p-6">
        <Suspense fallback={<GoalChatsSkeleton />}>
          <GoalChatsSection goalAddress={goalAddress} />
        </Suspense>
      </div>
    </main>
  );
}
