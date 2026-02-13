import "server-only";

import { headers } from "next/headers";
import { GoalChatsClient } from "@/components/features/chat/goal-chats-client";
import { getPrivyIdToken } from "@/lib/domains/auth/session";
import { fetchGoalChats } from "@/lib/domains/chat/get-chats";

export async function GoalChatsSection({ goalAddress }: { goalAddress: string }) {
  await headers();
  const identityToken = await getPrivyIdToken();
  const chats = await fetchGoalChats({ identityToken, goalAddress });

  return <GoalChatsClient goalAddress={goalAddress} identityToken={identityToken} chats={chats} />;
}
