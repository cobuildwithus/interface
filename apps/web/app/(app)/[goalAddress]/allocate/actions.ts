"use server";

import { getUser } from "@/lib/domains/auth/session";
import { setAllocateIntroDismissed } from "@/lib/domains/goals/allocate-intro";

export async function dismissAllocateHowItWorks(goalAddress: string): Promise<boolean> {
  const userAddress = await getUser();
  if (!userAddress) return false;
  return setAllocateIntroDismissed(userAddress, goalAddress);
}
