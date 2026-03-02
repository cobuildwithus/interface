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
  searchParams: Promise<{ context?: string | string[] }>;
};

export default async function GoalChatPage({ params, searchParams }: PageProps) {
  const { chatId, goalAddress } = await params;
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
