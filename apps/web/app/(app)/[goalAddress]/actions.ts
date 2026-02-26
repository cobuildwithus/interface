"use server";

import { revalidateTag } from "next/cache";
import { getUser } from "@/lib/domains/auth/session";
import {
  GOAL_ACTION_CARD_READ_CACHE_TAG,
  setGoalActionCardRead,
} from "@/lib/domains/goals/action-card-read";

export async function markGoalActionCardRead(
  goalAddress: string,
  cardIndex: number
): Promise<boolean> {
  const userAddress = await getUser();
  if (!userAddress) return false;

  const didSet = await setGoalActionCardRead(userAddress, goalAddress, cardIndex);
  if (didSet) {
    revalidateTag(GOAL_ACTION_CARD_READ_CACHE_TAG, "seconds");
  }

  return didSet;
}
