"use server";

import { getSession } from "@/lib/domains/auth/session";
import { deleteSignerRecord } from "@/lib/integrations/farcaster/signer-store";
import type { FarcasterSignerStatus } from "@/lib/integrations/farcaster/signer-types";

export async function disconnectFarcasterSignerAction(): Promise<
  { ok: true; status: FarcasterSignerStatus } | { ok: false; error: string }
> {
  const session = await getSession();
  const fid = session.farcaster?.fid ?? null;

  if (!fid) {
    return { ok: false, error: "Connect a Farcaster account to manage posting access." };
  }

  await deleteSignerRecord(fid);

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
