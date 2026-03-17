"use client";

import { useModalStatus, usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  isConnectedSocialAccount,
  resolveFarcasterAccount,
  resolveXAccount,
  toLinkedAccountsServerView,
  type ResolvedFarcasterAccount,
  type ResolvedXAccount,
} from "@/lib/domains/auth/linked-accounts/server-view";
import type { LinkedAccountsResponse } from "@/lib/domains/auth/linked-accounts/types";
import { useUserContext } from "@/lib/domains/auth/user-context";
import { getAuthIdentityKey } from "@/lib/hooks/query-keys";
import { useLinkedAccounts } from "@/lib/hooks/use-linked-accounts";
import { useProfile } from "@/lib/hooks/use-profile";
import { syncLinkedAccountsFromSession } from "@/lib/domains/auth/linked-accounts/sync-linked-accounts";
import { parseLinkErrorMessage } from "@/lib/domains/auth/link-account-utils";
import { useRefreshLinkedAccountState } from "@/lib/domains/auth/use-refresh-linked-account-state";
import type { ErrorLike } from "@/lib/shared/errors";

export type LinkAccountType = "farcaster" | "twitter";

export type FarcasterLinkedAccount = ResolvedFarcasterAccount;

export type TwitterLinkedAccount = ResolvedXAccount;
type PrivyUser = ReturnType<typeof usePrivy>["user"];

type LinkedAccountInfo = {
  farcaster?: FarcasterLinkedAccount | null;
  twitter?: TwitterLinkedAccount | null;
};

type UseLinkedAccountStateOptions = {
  initialLinkedAccounts?: LinkedAccountInfo;
  initialLinkedAccountsResponse?: LinkedAccountsResponse;
};

type UseLinkedAccountActionsOptions = {
  address?: string | null;
  onLinked?: () => Promise<void> | void;
};

const PENDING_SOCIAL_LINK_STORAGE_KEY = "cobuild:pending-social-link";

export function useLinkedAccountState(options: UseLinkedAccountStateOptions = {}) {
  const { user } = usePrivy();
  const currentUser = useUserContext();
  const profileAddress =
    currentUser?.address ?? options.initialLinkedAccountsResponse?.address ?? undefined;
  const { data: profile } = useProfile(profileAddress);
  const currentIdentityKey = getAuthIdentityKey({
    address: currentUser?.address ?? null,
    farcasterFid: currentUser?.farcaster?.fid ?? null,
  });
  const initialIdentityKey =
    options.initialLinkedAccounts || options.initialLinkedAccountsResponse
      ? getAuthIdentityKey({
          address: options.initialLinkedAccountsResponse?.address ?? null,
          farcasterFid: options.initialLinkedAccounts?.farcaster?.fid ?? null,
        })
      : undefined;
  const { data: linkedAccountsData } = useLinkedAccounts({
    initialData: options.initialLinkedAccountsResponse,
    initialIdentityKey,
  });
  const linkedAccountsServerView = toLinkedAccountsServerView(linkedAccountsData);
  const seededFarcaster =
    initialIdentityKey === currentIdentityKey
      ? toSeededFarcasterAccount(options.initialLinkedAccounts?.farcaster)
      : null;
  const seededTwitter =
    initialIdentityKey === currentIdentityKey
      ? toSeededXAccount(options.initialLinkedAccounts?.twitter)
      : null;
  const sessionFarcasterSource =
    user?.farcaster && currentUser?.farcaster?.fid === user.farcaster.fid
      ? currentUser.farcaster.source
      : "privy";

  const linkedAccounts = {
    farcaster:
      resolveFarcasterAccount({
        linkedAccounts: linkedAccountsServerView.accounts,
        sessionFarcaster:
          user?.farcaster && user.farcaster.fid !== null
            ? {
                fid: user.farcaster.fid,
                username: user.farcaster.username ?? undefined,
                displayName: user.farcaster.displayName ?? undefined,
                source: sessionFarcasterSource,
              }
            : null,
        detectedFarcaster:
          profile?.farcaster?.fid !== null && profile?.farcaster?.fid !== undefined
            ? {
                fid: profile.farcaster.fid,
                username: profile.farcaster.name ?? undefined,
              }
            : null,
      }) ?? seededFarcaster,
    twitter:
      resolveXAccount({
        linkedAccounts: linkedAccountsServerView.accounts,
        sessionTwitter: user?.twitter
          ? {
              username: user.twitter.username ?? undefined,
              name: user.twitter.name ?? undefined,
            }
          : null,
      }) ?? seededTwitter,
  };

  const isLinked = (type: LinkAccountType) => isConnectedSocialAccount(linkedAccounts[type]);

  return {
    linkedAccounts,
    isLinked,
  };
}

export function useLinkedAccountActions(options: UseLinkedAccountActionsOptions = {}) {
  const onLinked = options.onLinked;
  const { user, linkFarcaster: privyLinkFarcaster, linkTwitter: privyLinkTwitter } = usePrivy();
  const { isOpen: isPrivyModalOpen } = useModalStatus();
  const { refreshLinkedAccountState } = useRefreshLinkedAccountState(options.address);
  const [linkingType, setLinkingType] = useState<LinkAccountType | null>(null);
  const [pendingLinkType, setPendingLinkType] = useState<LinkAccountType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handledLinkedAccountRef = useRef<string | null>(null);
  const activeLinkAttemptRef = useRef<{
    sawModalOpen: boolean;
    type: LinkAccountType;
  } | null>(null);

  const clearPendingLink = useCallback(() => {
    setPendingLinkType(null);
    writePendingLinkType(null);
  }, []);

  const handleLinkSuccess = useCallback(async () => {
    setLinkingType(null);
    clearPendingLink();
    setError(null);
    try {
      const result = await syncLinkedAccountsFromSession();
      if (!result.ok && result.reason === "missing_address") {
        toast.error("Connect a wallet to save linked accounts.");
      }
    } catch {
      toast.error("Failed to sync linked accounts.");
    } finally {
      await refreshLinkedAccountState();
      await onLinked?.();
    }
  }, [clearPendingLink, onLinked, refreshLinkedAccountState]);

  useEffect(() => {
    setPendingLinkType(readPendingLinkType());
  }, []);

  useEffect(() => {
    const activeLinkType = linkingType ?? pendingLinkType;
    if (!activeLinkType) {
      handledLinkedAccountRef.current = null;
      return;
    }

    const linkedAccountKey = getLinkedAccountKey(user, activeLinkType);
    if (!linkedAccountKey) {
      return;
    }

    if (handledLinkedAccountRef.current === linkedAccountKey) {
      return;
    }

    handledLinkedAccountRef.current = linkedAccountKey;
    void handleLinkSuccess();
  }, [handleLinkSuccess, linkingType, pendingLinkType, user]);

  useEffect(() => {
    if (!linkingType) {
      activeLinkAttemptRef.current = null;
      return;
    }

    if (!activeLinkAttemptRef.current || activeLinkAttemptRef.current.type !== linkingType) {
      activeLinkAttemptRef.current = {
        type: linkingType,
        sawModalOpen: isPrivyModalOpen,
      };
    } else if (isPrivyModalOpen) {
      activeLinkAttemptRef.current.sawModalOpen = true;
    }

    if (getLinkedAccountKey(user, linkingType)) {
      return;
    }

    if (linkingType === "twitter" && !isPrivyModalOpen) {
      setLinkingType(null);
      return;
    }

    if (!isPrivyModalOpen && activeLinkAttemptRef.current.sawModalOpen) {
      setLinkingType(null);
    }
  }, [isPrivyModalOpen, linkingType, user]);

  const link = useCallback(
    async (type: LinkAccountType) => {
      setLinkingType(type);
      setPendingLinkType(type);
      writePendingLinkType(type);
      setError(null);
      try {
        if (type === "farcaster") {
          privyLinkFarcaster();
          return;
        }
        privyLinkTwitter();
      } catch (err) {
        const message = parseLinkErrorMessage(err as ErrorLike) || "Failed to link account";
        toast.error(message);
        setError(message);
        setLinkingType(null);
        clearPendingLink();
      }
    },
    [clearPendingLink, privyLinkFarcaster, privyLinkTwitter]
  );

  return {
    link,
    linkFarcaster: async () => link("farcaster"),
    linkTwitter: async () => link("twitter"),
    isLinking: linkingType !== null,
    isLinkingType: (type: LinkAccountType) => linkingType === type,
    error,
  };
}

export function useLinkedAccountClient(
  options: UseLinkedAccountStateOptions & UseLinkedAccountActionsOptions = {}
) {
  const { linkedAccounts, isLinked } = useLinkedAccountState(options);
  const actions = useLinkedAccountActions(options);

  return {
    ...actions,
    linkedAccounts,
    isLinked,
  };
}

function toSeededFarcasterAccount(
  account: FarcasterLinkedAccount | null | undefined
): ResolvedFarcasterAccount | null {
  if (!account?.fid) {
    return null;
  }

  return {
    fid: account.fid,
    username: normalizeOptionalText(account.username),
    displayName: normalizeOptionalText(account.displayName),
    avatarUrl: normalizeOptionalText(account.avatarUrl),
    source: account.source,
  };
}

function toSeededXAccount(
  account: TwitterLinkedAccount | null | undefined
): ResolvedXAccount | null {
  if (!account) {
    return null;
  }

  return {
    username: normalizeOptionalText(account.username),
    name: normalizeOptionalText(account.name),
    source: account.source,
  };
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function readPendingLinkType(): LinkAccountType | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.sessionStorage.getItem(PENDING_SOCIAL_LINK_STORAGE_KEY);
    return stored === "farcaster" || stored === "twitter" ? stored : null;
  } catch {
    return null;
  }
}

function writePendingLinkType(type: LinkAccountType | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (type) {
      window.sessionStorage.setItem(PENDING_SOCIAL_LINK_STORAGE_KEY, type);
      return;
    }

    window.sessionStorage.removeItem(PENDING_SOCIAL_LINK_STORAGE_KEY);
  } catch {
    // Ignore session storage failures and keep the in-memory flow working.
  }
}

function getLinkedAccountKey(user: PrivyUser, type: LinkAccountType): string | null {
  if (type === "farcaster") {
    return user?.farcaster?.fid ? `farcaster:${user.farcaster.fid}` : null;
  }

  const username = normalizeOptionalText(user?.twitter?.username);
  return username ? `twitter:${username}` : null;
}
