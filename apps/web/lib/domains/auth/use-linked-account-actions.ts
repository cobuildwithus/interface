"use client";

import { useLinkAccount as usePrivyLinkAccount, usePrivy } from "@privy-io/react-auth";
import { useCallback, useState } from "react";
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
  const { refreshLinkedAccountState } = useRefreshLinkedAccountState(options.address);
  const [linkingType, setLinkingType] = useState<LinkAccountType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLinkSuccess = useCallback(() => {
    setLinkingType(null);
    setError(null);
    void syncLinkedAccountsFromSession()
      .then((result) => {
        if (!result.ok && result.reason === "missing_address") {
          toast.error("Connect a wallet to save linked accounts.");
        }
      })
      .catch(() => {
        toast.error("Failed to sync linked accounts.");
      })
      .finally(async () => {
        await refreshLinkedAccountState();
        await onLinked?.();
      });
  }, [onLinked, refreshLinkedAccountState]);

  const { linkFarcaster, linkTwitter } = usePrivyLinkAccount({
    onSuccess: handleLinkSuccess,
    onError: () => {
      setLinkingType(null);
    },
  });

  const link = useCallback(
    async (type: LinkAccountType) => {
      setLinkingType(type);
      setError(null);
      try {
        if (type === "farcaster") {
          await linkFarcaster();
          return;
        }
        await linkTwitter();
      } catch (err) {
        const message = parseLinkErrorMessage(err as ErrorLike) || "Failed to link account";
        toast.error(message);
        setError(message);
        setLinkingType(null);
      }
    },
    [linkFarcaster, linkTwitter]
  );

  return {
    link,
    linkFarcaster: () => link("farcaster"),
    linkTwitter: () => link("twitter"),
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
