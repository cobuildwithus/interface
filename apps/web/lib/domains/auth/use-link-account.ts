"use client";

import { useAccount } from "wagmi";
import type { LinkedAccountsResponse } from "@/lib/domains/auth/linked-accounts/types";
import {
  useLinkedAccountClient,
  type FarcasterLinkedAccount,
  type LinkAccountType,
  type TwitterLinkedAccount,
} from "@/lib/domains/auth/use-linked-account-actions";

type UseLinkAccountOptions = {
  initialLinkedAccounts?: {
    farcaster?: FarcasterLinkedAccount | null;
    twitter?: TwitterLinkedAccount | null;
  };
  initialLinkedAccountsResponse?: LinkedAccountsResponse;
  onLinked?: () => Promise<void> | void;
};

export type { LinkAccountType };

export function useLinkAccount(options: UseLinkAccountOptions = {}) {
  const { address } = useAccount();
  return useLinkedAccountClient({
    address,
    initialLinkedAccounts: options.initialLinkedAccounts,
    initialLinkedAccountsResponse: options.initialLinkedAccountsResponse,
    onLinked: options.onLinked,
  });
}
