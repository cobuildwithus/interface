"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UserResponse } from "@/lib/domains/auth/user-response-types";
import { useUserContext } from "@/lib/domains/auth/user-context";
import type { LinkedAccountsResponse } from "@/lib/domains/auth/linked-accounts/types";
import { getAuthIdentityKey, getLinkedAccountsQueryKey } from "@/lib/hooks/query-keys";

export const EMPTY_LINKED_ACCOUNTS_RESPONSE: LinkedAccountsResponse = {
  address: null,
  accounts: [],
};

export async function fetchLinkedAccounts(): Promise<LinkedAccountsResponse> {
  try {
    const res = await fetch("/api/linked-accounts", { cache: "no-store" });
    if (!res.ok) return EMPTY_LINKED_ACCOUNTS_RESPONSE;
    return (await res.json()) as LinkedAccountsResponse;
  } catch {
    return EMPTY_LINKED_ACCOUNTS_RESPONSE;
  }
}

type UseLinkedAccountsOptions = {
  initialData?: LinkedAccountsResponse;
  initialIdentityKey?: string;
};

function matchesLinkedAccountsSeedIdentity(
  user: UserResponse | null,
  seed: LinkedAccountsResponse | undefined
) {
  if (!seed) return false;

  const userAddress = user?.address?.toLowerCase() ?? null;
  const seedAddress = seed.address?.toLowerCase() ?? null;
  return userAddress ? seedAddress === userAddress : seedAddress === null;
}

export function useLinkedAccounts(options: UseLinkedAccountsOptions = {}) {
  const user = useUserContext();
  const identityKey = getAuthIdentityKey({
    address: user?.address ?? null,
    farcasterFid: user?.farcaster?.fid ?? null,
  });
  const initialData =
    options.initialIdentityKey !== undefined
      ? options.initialIdentityKey === identityKey
        ? options.initialData
        : undefined
      : matchesLinkedAccountsSeedIdentity(user, options.initialData)
        ? options.initialData
        : undefined;

  const query = useQuery({
    queryKey: getLinkedAccountsQueryKey(identityKey),
    queryFn: fetchLinkedAccounts,
    initialData,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const mutate = useCallback(async () => {
    const result = await query.refetch();
    return result.data ?? EMPTY_LINKED_ACCOUNTS_RESPONSE;
  }, [query]);

  return {
    data: query.data ?? EMPTY_LINKED_ACCOUNTS_RESPONSE,
    isLoading: query.isLoading,
    mutate,
  };
}
