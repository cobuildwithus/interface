import { Suspense } from "react";
import { GoalChatSection } from "./chat-section";
import { GoalChatSkeleton } from "./chat-skeleton";
import { buildPageMetadata } from "@/lib/shared/page-metadata";

export const metadata = buildPageMetadata({
  title: "Chat | Cobuild",
  description: "Conversation thread for this goal.",
  robots: { index: false, follow: false },
});

type PageProps = {
  params: Promise<{ goalAddress: string; chatId: string }>;
};

export default async function GoalChatPage({ params }: PageProps) {
  const { chatId, goalAddress } = await params;
  return (
    <main className="flex h-full min-h-0 w-full touch-pan-y justify-center overflow-hidden p-0">
      <Suspense fallback={<GoalChatSkeleton />}>
        <GoalChatSection chatId={chatId} goalAddress={goalAddress} />
      </Suspense>
    </main>
  );
}
