"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useUserContext } from "@/lib/domains/auth/user-context";
import { fetchSignerStatus } from "@/lib/hooks/use-farcaster-signer";
import { fetchLinkedAccounts } from "@/lib/hooks/use-linked-accounts";
import {
  getAuthIdentityKey,
  getFarcasterSignerQueryKey,
  getLinkedAccountsQueryKey,
  getProfileQueryKey,
} from "@/lib/hooks/query-keys";

export function useRefreshLinkedAccountState(address?: string | null) {
  const queryClient = useQueryClient();
  const user = useUserContext();
  const profileAddress = address ?? user?.address ?? null;
  const identityKey = getAuthIdentityKey({
    address: profileAddress,
    farcasterFid: user?.farcaster?.fid ?? null,
  });

  const refreshLinkedAccounts = useCallback(
    () =>
      queryClient.fetchQuery({
        queryKey: getLinkedAccountsQueryKey(identityKey),
        queryFn: fetchLinkedAccounts,
        staleTime: 0,
      }),
    [identityKey, queryClient]
  );

  const refreshSigner = useCallback(
    () =>
      queryClient.fetchQuery({
        queryKey: getFarcasterSignerQueryKey(identityKey),
        queryFn: fetchSignerStatus,
        staleTime: 0,
      }),
    [identityKey, queryClient]
  );

  const invalidateProfile = useCallback(async () => {
    if (!profileAddress) return;
    await queryClient.invalidateQueries({
      queryKey: getProfileQueryKey(profileAddress),
      exact: true,
    });
  }, [profileAddress, queryClient]);

  const refreshLinkedAccountState = useCallback(
    async ({ includeSigner = false }: { includeSigner?: boolean } = {}) => {
      await Promise.all([
        refreshLinkedAccounts(),
        includeSigner ? refreshSigner() : Promise.resolve(null),
        invalidateProfile(),
      ]);
    },
    [invalidateProfile, refreshLinkedAccounts, refreshSigner]
  );

  return {
    refreshLinkedAccounts,
    refreshSigner,
    refreshLinkedAccountState,
  };
}
