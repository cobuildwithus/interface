"use client";

import type { UserResponse } from "@/lib/domains/auth/user-response-types";
import { isNeynarScoreIneligible } from "@/lib/domains/eligibility/constants";
import { useUserContext } from "@/lib/domains/auth/user-context";

const EMPTY_USER: UserResponse = {
  address: null,
  farcaster: null,
  twitter: null,
};

export function useUser() {
  const contextUser = useUserContext();
  if (!contextUser) {
    throw new Error("useUser must be used within UserProvider");
  }
  const user = contextUser ?? EMPTY_USER;
  const neynarScoreIneligible = isNeynarScoreIneligible(user.farcaster?.neynarScore ?? null);

  return {
    address: user.address,
    farcaster: user.farcaster,
    twitter: user.twitter,
    isAuthenticated: user.address !== null,
    isNeynarScoreIneligible: neynarScoreIneligible,
    isLoading: false,
  };
}
