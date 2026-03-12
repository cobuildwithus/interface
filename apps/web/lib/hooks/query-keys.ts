import { COBUILD_PROJECT_ID } from "@/lib/domains/token/onchain/revnet";

export const LINKED_ACCOUNTS_QUERY_KEY = "linked-accounts";
export const FARCASTER_SIGNER_QUERY_KEY = "farcaster-signer";
export const ONRAMP_STATUS_QUERY_KEY = ["onramp-status"] as const;
export const ETH_PRICE_QUERY_KEY = ["eth-price"] as const;
export const REVNET_DATA_QUERY_KEY = "revnet-data";
export const PROFILE_QUERY_KEY = "profile";
export const ANONYMOUS_AUTH_QUERY_KEY = "anonymous";

export type AuthIdentitySnapshot = {
  address: string | null;
  farcasterFid: number | null;
};

function normalizeQueryAddress(address: string) {
  return address.toLowerCase();
}

function normalizeFarcasterFid(farcasterFid: number | null | undefined) {
  return farcasterFid && farcasterFid > 0 ? farcasterFid : null;
}

export function getAuthIdentitySnapshot({
  address,
  farcasterFid,
}: {
  address?: string | null;
  farcasterFid?: number | null;
}): AuthIdentitySnapshot {
  return {
    address: address ? normalizeQueryAddress(address) : null,
    farcasterFid: normalizeFarcasterFid(farcasterFid),
  };
}

export function getAuthIdentityKey(identity: {
  address?: string | null;
  farcasterFid?: number | null;
}) {
  const snapshot = getAuthIdentitySnapshot(identity);
  if (snapshot.address) {
    return `address:${snapshot.address}`;
  }

  if (snapshot.farcasterFid) {
    return `farcaster:${snapshot.farcasterFid}`;
  }

  return ANONYMOUS_AUTH_QUERY_KEY;
}

export function getLinkedAccountsQueryKey(identityKey: string) {
  return [LINKED_ACCOUNTS_QUERY_KEY, identityKey] as const;
}

export function getFarcasterSignerQueryKey(identityKey: string) {
  return [FARCASTER_SIGNER_QUERY_KEY, identityKey] as const;
}

export function getProfileQueryKey(address: string) {
  return [PROFILE_QUERY_KEY, normalizeQueryAddress(address)] as const;
}

export function getRevnetDataQueryKey(projectId: bigint = COBUILD_PROJECT_ID) {
  return [REVNET_DATA_QUERY_KEY, projectId.toString()] as const;
}
