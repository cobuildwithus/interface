import type { LinkedAccountRecord, LinkedAccountsResponse } from "./types";

export type LinkedFarcasterAccountServerView = LinkedAccountRecord & {
  platform: "farcaster";
  fid: number | null;
};

export type LinkedXAccountServerView = LinkedAccountRecord & {
  platform: "x";
};

export type LinkedAccountServerView = LinkedFarcasterAccountServerView | LinkedXAccountServerView;

export type LinkedAccountsServerView = {
  address: string | null;
  accounts: LinkedAccountServerView[];
};

export type SocialAccountResolutionSource = "linked" | "session" | "detected";

export type ResolvedFarcasterAccount = {
  fid: number;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  source: SocialAccountResolutionSource;
};

export type ResolvedXAccount = {
  username?: string;
  name?: string;
  source: Exclude<SocialAccountResolutionSource, "detected">;
};

type SessionFarcasterAccount = {
  fid: number;
  username?: string | null;
  displayName?: string | null;
  pfp?: string | null;
  source?: "privy" | "verified_address";
};

type SessionXAccount = {
  username?: string | null;
  name?: string | null;
};

type DetectedFarcasterAccount = {
  fid?: number | null;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  pfp?: string | null;
};

export function parseLinkedFarcasterFid(platformId: string): number | null {
  const fid = Number.parseInt(platformId, 10);
  return Number.isFinite(fid) && fid > 0 ? fid : null;
}

export function toLinkedAccountServerView(account: LinkedAccountRecord): LinkedAccountServerView {
  if (account.platform === "farcaster") {
    return {
      ...account,
      fid: parseLinkedFarcasterFid(account.platformId),
    };
  }

  return {
    ...account,
    platform: "x",
  };
}

export function toLinkedAccountsServerView(
  response: LinkedAccountsResponse
): LinkedAccountsServerView {
  return {
    address: response.address,
    accounts: response.accounts.map(toLinkedAccountServerView),
  };
}

export function isLinkedFarcasterAccountServerView(
  account: LinkedAccountServerView
): account is LinkedFarcasterAccountServerView {
  return account.platform === "farcaster";
}

export function getPreferredLinkedFarcasterAccount(
  accounts: readonly LinkedAccountServerView[]
): LinkedFarcasterAccountServerView | null {
  const farcasterAccounts = accounts.filter(
    (account): account is LinkedFarcasterAccountServerView =>
      isLinkedFarcasterAccountServerView(account) && account.fid !== null
  );
  return (
    farcasterAccounts.find((account) => account.source === "neynar_signer" || account.canPost) ??
    farcasterAccounts[0] ??
    null
  );
}

export function getLinkedXAccount(
  accounts: readonly LinkedAccountServerView[]
): LinkedXAccountServerView | null {
  return (
    accounts.find((account): account is LinkedXAccountServerView => account.platform === "x") ??
    null
  );
}

export function toResolvedLinkedFarcasterAccount(
  account: LinkedFarcasterAccountServerView | null
): ResolvedFarcasterAccount | null {
  if (!account?.fid) {
    return null;
  }

  return {
    fid: account.fid,
    username: normalizeOptionalText(account.username),
    displayName: normalizeOptionalText(account.displayName),
    avatarUrl: normalizeOptionalText(account.avatarUrl),
    source: "linked",
  };
}

export function toResolvedLinkedXAccount(
  account: LinkedXAccountServerView | null
): ResolvedXAccount | null {
  if (!account) {
    return null;
  }

  return {
    username: normalizeOptionalText(account.username),
    name: normalizeOptionalText(account.displayName),
    source: "linked",
  };
}

export function toResolvedSessionFarcasterAccount(
  account: SessionFarcasterAccount | null | undefined
): ResolvedFarcasterAccount | null {
  if (!account?.fid) {
    return null;
  }

  return {
    fid: account.fid,
    username: normalizeOptionalText(account.username),
    displayName: normalizeOptionalText(account.displayName),
    avatarUrl: normalizeOptionalText(account.pfp),
    source: account.source === "verified_address" ? "detected" : "session",
  };
}

export function toResolvedDetectedFarcasterAccount(
  account: DetectedFarcasterAccount | null | undefined
): ResolvedFarcasterAccount | null {
  if (!account?.fid) {
    return null;
  }

  return {
    fid: account.fid,
    username: normalizeOptionalText(account.username),
    displayName: normalizeOptionalText(account.displayName),
    avatarUrl: normalizeOptionalText(account.avatarUrl ?? account.pfp),
    source: "detected",
  };
}

export function toResolvedSessionXAccount(
  account: SessionXAccount | null | undefined
): ResolvedXAccount | null {
  if (!account) {
    return null;
  }

  return {
    username: normalizeOptionalText(account.username),
    name: normalizeOptionalText(account.name),
    source: "session",
  };
}

export function resolveFarcasterAccount(params: {
  linkedAccounts: readonly LinkedAccountServerView[];
  sessionFarcaster?: SessionFarcasterAccount | null;
  detectedFarcaster?: DetectedFarcasterAccount | null;
}): ResolvedFarcasterAccount | null {
  return (
    toResolvedLinkedFarcasterAccount(getPreferredLinkedFarcasterAccount(params.linkedAccounts)) ??
    toResolvedSessionFarcasterAccount(params.sessionFarcaster) ??
    toResolvedDetectedFarcasterAccount(params.detectedFarcaster)
  );
}

export function resolveXAccount(params: {
  linkedAccounts: readonly LinkedAccountServerView[];
  sessionTwitter?: SessionXAccount | null;
}): ResolvedXAccount | null {
  return (
    toResolvedLinkedXAccount(getLinkedXAccount(params.linkedAccounts)) ??
    toResolvedSessionXAccount(params.sessionTwitter)
  );
}

export function isConnectedSocialAccount(
  account: { source: SocialAccountResolutionSource } | null | undefined
) {
  return account ? account.source !== "detected" : false;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
