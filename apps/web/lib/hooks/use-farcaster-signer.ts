"use client";

import useSWR from "swr";
import type { FarcasterSignerStatus } from "@/lib/integrations/farcaster/signer-types";

const EMPTY_STATUS: FarcasterSignerStatus = {
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
    if (!res.ok) return EMPTY_STATUS;
    return (await res.json()) as FarcasterSignerStatus;
  } catch {
    return EMPTY_STATUS;
  }
}

export function useFarcasterSigner() {
  const { data, isLoading, mutate } = useSWR<FarcasterSignerStatus>(
    "/api/farcaster/signer",
    fetchSignerStatus,
    { revalidateOnFocus: false }
  );

  return {
    status: data ?? EMPTY_STATUS,
    isLoading,
    mutate,
  };
}
