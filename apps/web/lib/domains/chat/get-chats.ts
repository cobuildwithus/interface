import "server-only";

import { fetchChatApi } from "./server-api";
import type { ChatListItem } from "./types";

const EMPTY_CHATS: ChatListItem[] = [];

type FetchGoalChatsOptions = {
  identityToken?: string;
  goalAddress: string;
};

export async function fetchGoalChats({
  identityToken,
  goalAddress,
}: FetchGoalChatsOptions): Promise<ChatListItem[]> {
  if (!identityToken) return EMPTY_CHATS;

  try {
    const response = await fetchChatApi(
      `/api/chats?goalAddress=${encodeURIComponent(goalAddress)}`,
      { identityToken }
    );

    if (!response.ok) return EMPTY_CHATS;

    const payload = (await response.json().catch(() => null)) as { chats?: ChatListItem[] } | null;
    return payload?.chats ?? EMPTY_CHATS;
  } catch {
    return EMPTY_CHATS;
  }
}
