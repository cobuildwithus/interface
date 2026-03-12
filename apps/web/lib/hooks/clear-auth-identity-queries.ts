"use client";

import type { QueryClient } from "@tanstack/react-query";
import {
  getAuthIdentityKey,
  getFarcasterSignerQueryKey,
  getLinkedAccountsQueryKey,
  getProfileQueryKey,
  type AuthIdentitySnapshot,
} from "@/lib/hooks/query-keys";

type QueryClientRemover = Pick<QueryClient, "removeQueries">;

export function clearAuthIdentityQueries(
  queryClient: QueryClientRemover,
  identity: AuthIdentitySnapshot
) {
  const identityKey = getAuthIdentityKey(identity);

  queryClient.removeQueries({
    queryKey: getLinkedAccountsQueryKey(identityKey),
    exact: true,
  });
  queryClient.removeQueries({
    queryKey: getFarcasterSignerQueryKey(identityKey),
    exact: true,
  });

  if (identity.address) {
    queryClient.removeQueries({
      queryKey: getProfileQueryKey(identity.address),
      exact: true,
    });
  }
}
