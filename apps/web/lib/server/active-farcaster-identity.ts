import "server-only";

import {
  resolveFarcasterAccount,
  type LinkedAccountServerView,
} from "@/lib/domains/auth/linked-accounts/server-view";
import { getLinkedAccountsServerView } from "./linked-accounts-response";
import type { Session } from "./session-types";

export type ActiveFarcasterIdentity = {
  fid: number | null;
  username: string | null;
  displayName: string | null;
  pfp: string | null;
};

export async function getActiveFarcasterIdentity(
  session: Session,
  options?: { linkedAccounts?: LinkedAccountServerView[]; usePrimary?: boolean }
): Promise<ActiveFarcasterIdentity> {
  const sessionFarcaster =
    session.farcaster?.source === "verified_address" ? null : (session.farcaster ?? null);
  const address = session.address ?? null;
  const linkedAccounts =
    options?.linkedAccounts ??
    (address
      ? (await getLinkedAccountsServerView(address, { usePrimary: options?.usePrimary })).accounts
      : []);
  const activeAccount = resolveFarcasterAccount({
    linkedAccounts,
    sessionFarcaster,
  });

  return {
    fid: activeAccount?.fid ?? null,
    username: activeAccount?.username ?? null,
    displayName: activeAccount?.displayName ?? null,
    pfp: activeAccount?.avatarUrl ?? null,
  };
}
