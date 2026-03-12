import "server-only";

import { getLinkedAccountsByAddress } from "@/lib/domains/auth/linked-accounts/store";
import { toLinkedAccountsServerView } from "@/lib/domains/auth/linked-accounts/server-view";
import type { LinkedAccountsResponse } from "@/lib/domains/auth/linked-accounts/types";
import type { LinkedAccountsServerView } from "@/lib/domains/auth/linked-accounts/server-view";

export async function getLinkedAccountsResponse(
  address: string | null,
  options?: { usePrimary?: boolean }
): Promise<LinkedAccountsResponse> {
  if (!address) {
    return { address: null, accounts: [] };
  }

  const accounts = await getLinkedAccountsByAddress(address, { usePrimary: options?.usePrimary });
  return { address, accounts };
}

export async function getLinkedAccountsServerView(
  address: string | null,
  options?: { usePrimary?: boolean }
): Promise<LinkedAccountsServerView> {
  const response = await getLinkedAccountsResponse(address, options);
  return toLinkedAccountsServerView(response);
}
