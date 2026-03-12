"use server";

import { clearLinkedAccountPostingAccess } from "@/lib/domains/auth/linked-accounts/store";
import { getSession } from "@/lib/domains/auth/session";
import { deleteSignerRecord } from "@/lib/integrations/farcaster/signer-store";
import type { FarcasterSignerStatus } from "@/lib/integrations/farcaster/signer-types";
import { getActiveFarcasterIdentity } from "@/lib/server/active-farcaster-identity";

export async function disconnectFarcasterSignerAction(): Promise<
  { ok: true; status: FarcasterSignerStatus } | { ok: false; error: string }
> {
  const session = await getSession();
  const activeFarcaster = await getActiveFarcasterIdentity(session, { usePrimary: true });
  const fid = activeFarcaster.fid;

  if (!fid) {
    return { ok: false, error: "Connect a Farcaster account to manage posting access." };
  }

  await deleteSignerRecord(fid);

  if (session.address) {
    await clearLinkedAccountPostingAccess({
      ownerAddress: session.address,
      platform: "farcaster",
      platformId: String(fid),
      source:
        session.farcaster?.fid === fid && session.farcaster.source === "privy"
          ? "privy"
          : "verified_address",
    });
  }

  return {
    ok: true,
    status: {
      fid,
      hasSigner: false,
      signerPermissions: null,
      neynarPermissions: null,
      neynarStatus: null,
      neynarError: null,
      updatedAt: null,
    },
  };
}
