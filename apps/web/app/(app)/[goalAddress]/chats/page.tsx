import type { Metadata } from "next";
import { Suspense } from "react";
import { GoalChatsSkeleton } from "@/components/common/skeletons/goal-chats-skeleton";
import { GridBackground } from "@/components/ui/grid-background";
import { generateGoalMetadata } from "../metadata";
import { GoalChatsSection } from "./goal-chats-section";

export async function generateMetadata(): Promise<Metadata> {
  return generateGoalMetadata({
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
