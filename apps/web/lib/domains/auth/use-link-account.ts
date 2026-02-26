"use client";

import { useLinkAccount as usePrivyLinkAccount, usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { useProfile } from "@/lib/hooks/use-profile";
import { useLinkedAccounts } from "@/lib/hooks/use-linked-accounts";
import { toast } from "sonner";
import type { ErrorLike } from "@/lib/shared/errors";
import { syncLinkedAccountsFromSession } from "@/lib/domains/auth/linked-accounts/sync-linked-accounts";
import { parseLinkErrorMessage } from "@/lib/domains/auth/link-account-utils";

export type LinkAccountType = "farcaster" | "twitter";

type LinkedAccountInfo = {
  farcaster?: { fid: number; username?: string; displayName?: string };
  twitter?: { username?: string; name?: string };
};

function toDbFarcasterAccount(
  account: { platformId: string; username: string | null; displayName: string | null } | undefined
): { fid: number; username?: string; displayName?: string } | undefined {
  if (!account) return undefined;
  const fid = Number.parseInt(account.platformId, 10);
  if (!Number.isFinite(fid)) return undefined;
  return {
    fid,
    username: account.username ?? undefined,
    displayName: account.displayName ?? undefined,
  };
}

function toDbTwitterAccount(
  account: { username: string | null; displayName: string | null } | undefined
): { username?: string; name?: string } | undefined {
  if (!account) return undefined;
  return {
    username: account.username ?? undefined,
    name: account.displayName ?? undefined,
  };
}

export function useLinkAccount() {
  const router = useRouter();
  const { user } = usePrivy();
  const { address } = useAccount();
  const { data: profile } = useProfile(address);
  const { data: linkedAccountsData, mutate: mutateLinkedAccounts } = useLinkedAccounts();
  const [linkingType, setLinkingType] = useState<LinkAccountType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { linkFarcaster, linkTwitter } = usePrivyLinkAccount({
    onSuccess: () => {
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
        .finally(() => {
          void mutateLinkedAccounts();
        });
      router.refresh();
    },
    onError: () => {
      // Error handled in catch block below
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
        } else {
          await linkTwitter();
        }
      } catch (err) {
        // Parse "client_error: User already has..." to get the readable part
        const message = parseLinkErrorMessage(err as ErrorLike);
        console.error("Link account error:", message);
        toast.error(message || "Failed to link account");
        setError(message || "Failed to link account");
      }
    },
    [linkFarcaster, linkTwitter]
  );

  // Prefer DB links, then Privy, then profile fallback.
  const privyFarcaster =
    user?.farcaster && user.farcaster.fid !== null
      ? {
          fid: user.farcaster.fid,
          username: user.farcaster.username ?? undefined,
          displayName: user.farcaster.displayName ?? undefined,
        }
      : undefined;

  const profileFarcaster =
    profile?.farcaster?.fid !== null && profile?.farcaster?.fid !== undefined
      ? {
          fid: profile.farcaster.fid,
          username: profile.farcaster.name ?? undefined,
          displayName: undefined,
        }
      : undefined;

  const dbFarcasterAccount = toDbFarcasterAccount(
    linkedAccountsData.accounts.find((account) => account.platform === "farcaster")
  );
  const dbTwitterAccount = toDbTwitterAccount(
    linkedAccountsData.accounts.find((account) => account.platform === "x")
  );
  const privyTwitter = user?.twitter
    ? {
        username: user.twitter.username ?? undefined,
        name: user.twitter.name ?? undefined,
      }
    : undefined;

  const linkedAccounts: LinkedAccountInfo = {
    farcaster: dbFarcasterAccount ?? privyFarcaster ?? profileFarcaster,
    twitter: dbTwitterAccount ?? privyTwitter,
  };

  return {
    link,
    linkFarcaster: () => link("farcaster"),
    linkTwitter: () => link("twitter"),
    isLinking: linkingType !== null,
    isLinkingType: (type: LinkAccountType) => linkingType === type,
    error,
    linkedAccounts,
    isLinked: (type: LinkAccountType) => !!linkedAccounts[type],
  };
}
