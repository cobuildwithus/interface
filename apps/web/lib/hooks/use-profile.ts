"use client";

import { getEmptyProfile } from "@/lib/domains/profile/empty-profile";
import type { Profile } from "@/lib/domains/profile/types";
import { useQuery } from "@tanstack/react-query";

async function fetchProfile(address: string): Promise<Profile> {
  const res = await fetch(`/api/profile?address=${encodeURIComponent(address)}`);
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export function useProfile(address: string | undefined) {
  return useQuery({
    queryKey: ["profile", address],
    queryFn: () => fetchProfile(address!),
    enabled: !!address,
    staleTime: 1000 * 60 * 60, // 1 hour
    placeholderData: address ? getEmptyProfile(address) : undefined,
  });
}
