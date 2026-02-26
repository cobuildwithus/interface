import "server-only";

import { getLinkedAccountsByAddress } from "@/lib/domains/auth/linked-accounts/store";
import type { LinkedAccountsResponse } from "@/lib/domains/auth/linked-accounts/types";

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
