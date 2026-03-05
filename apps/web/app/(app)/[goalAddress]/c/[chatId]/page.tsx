import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GoalChatSection } from "./chat-section";
import { GoalChatSkeleton } from "./chat-skeleton";
import { getGoalOverviewData } from "@/lib/domains/goals/goal-data";
import { generateGoalMetadata } from "../../metadata";

type MetadataProps = {
  params: Promise<{ goalAddress: string; chatId: string }>;
};

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { goalAddress, chatId } = await params;
  return generateGoalMetadata({
    goalAddress,
    pageName: "Chat",
    description: "Conversation thread for this goal.",
    pathSuffix: `/c/${chatId}`,
  });
}

type PageProps = {
  params: Promise<{ goalAddress: string; chatId: string }>;
  searchParams: Promise<{ context?: string | string[] }>;
};

export default async function GoalChatPage({ params, searchParams }: PageProps) {
  const { chatId, goalAddress } = await params;
  const overview = await getGoalOverviewData(goalAddress);
  if (!overview) notFound();
  const { context: rawContext } = await searchParams;
  const context =
    typeof rawContext === "string"
      ? rawContext
      : Array.isArray(rawContext)
        ? rawContext[0]
        : undefined;
  return (
    <main className="flex h-full min-h-0 w-full touch-pan-y justify-center overflow-hidden p-0">
      <Suspense fallback={<GoalChatSkeleton />}>
        <GoalChatSection chatId={chatId} goalAddress={goalAddress} context={context} />
      </Suspense>
    </main>
  );
}
