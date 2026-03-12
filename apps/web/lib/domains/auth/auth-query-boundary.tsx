"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { clearAuthIdentityQueries } from "@/lib/hooks/clear-auth-identity-queries";
import { getAuthIdentityKey, getAuthIdentitySnapshot } from "@/lib/hooks/query-keys";
import { useUserContext } from "@/lib/domains/auth/user-context";

export function AuthQueryBoundary() {
  const queryClient = useQueryClient();
  const user = useUserContext();
  const identity = getAuthIdentitySnapshot({
    address: user?.address ?? null,
    farcasterFid: user?.farcaster?.fid ?? null,
  });
  const previousIdentityRef = useRef(identity);
  const identityKey = getAuthIdentityKey(identity);

  useEffect(() => {
    const previousIdentity = previousIdentityRef.current;
    if (getAuthIdentityKey(previousIdentity) !== identityKey) {
      clearAuthIdentityQueries(queryClient, previousIdentity);
    }

    previousIdentityRef.current = identity;
  }, [identity, identityKey, queryClient]);

  return null;
}
