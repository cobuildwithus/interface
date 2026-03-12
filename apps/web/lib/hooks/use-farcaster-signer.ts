"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UserResponse } from "@/lib/domains/auth/user-response-types";
import { useUserContext } from "@/lib/domains/auth/user-context";
import type { FarcasterSignerStatus } from "@/lib/integrations/farcaster/signer-types";
import { getAuthIdentityKey, getFarcasterSignerQueryKey } from "@/lib/hooks/query-keys";

export const EMPTY_FARCASTER_SIGNER_STATUS: FarcasterSignerStatus = {
  fid: null,
  hasSigner: false,
  signerPermissions: null,
  neynarPermissions: null,
  neynarStatus: null,
  neynarError: null,
  updatedAt: null,
};

export async function fetchSignerStatus(): Promise<FarcasterSignerStatus> {
  try {
    const res = await fetch("/api/farcaster/signer", { cache: "no-store" });
    if (!res.ok) return EMPTY_FARCASTER_SIGNER_STATUS;
    return (await res.json()) as FarcasterSignerStatus;
  } catch {
    return EMPTY_FARCASTER_SIGNER_STATUS;
  }
}

type UseFarcasterSignerOptions = {
  initialStatus?: FarcasterSignerStatus;
  initialIdentityKey?: string;
};

function matchesFarcasterSignerSeedIdentity(
  user: UserResponse | null,
  identityKey: string,
  seedIdentityKey: string | undefined,
  seed: FarcasterSignerStatus | undefined
) {
  if (!seed) return false;

  if (seedIdentityKey !== undefined) {
    return seedIdentityKey === identityKey;
  }

  const userFid = user?.farcaster?.fid ?? null;
  return userFid ? seed.fid === userFid : seed.fid === null;
}

export function useFarcasterSigner(options: UseFarcasterSignerOptions = {}) {
  const user = useUserContext();
  const identityKey = getAuthIdentityKey({
    address: user?.address ?? null,
    farcasterFid: user?.farcaster?.fid ?? null,
  });
  const initialStatus = matchesFarcasterSignerSeedIdentity(
    user,
    identityKey,
    options.initialIdentityKey,
    options.initialStatus
  )
    ? options.initialStatus
    : undefined;

  const query = useQuery({
    queryKey: getFarcasterSignerQueryKey(identityKey),
    queryFn: fetchSignerStatus,
    initialData: initialStatus,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const mutate = useCallback(async () => {
    const result = await query.refetch();
    return result.data ?? EMPTY_FARCASTER_SIGNER_STATUS;
  }, [query]);

  return {
    status: query.data ?? EMPTY_FARCASTER_SIGNER_STATUS,
    isLoading: query.isLoading,
    mutate,
  };
}
