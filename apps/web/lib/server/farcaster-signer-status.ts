import "server-only";

import { getSignerRecord, setSignerRecord } from "@/lib/integrations/farcaster/signer-store";
import { getCachedNeynarSignerStatus } from "@/lib/integrations/farcaster/signer-status";
import type { FarcasterSignerStatus } from "@/lib/integrations/farcaster/signer-types";
import type { Session } from "./session-types";

export async function getFarcasterSignerStatus(
  session: Session,
  options?: { signerRecord?: Awaited<ReturnType<typeof getSignerRecord>> }
): Promise<FarcasterSignerStatus> {
  const fid = session.farcaster?.fid ?? null;

  if (!fid) {
    return {
      fid: null,
      hasSigner: false,
      signerPermissions: null,
      neynarPermissions: null,
      neynarStatus: null,
      neynarError: null,
      updatedAt: null,
    };
  }

  const record = options?.signerRecord ?? (await getSignerRecord(fid));
  const signerPermissions = Array.isArray(record?.signerPermissions)
    ? record.signerPermissions
    : null;
  const existingPermissions = signerPermissions ?? [];
  let neynarPermissions: string[] | null = null;
  let neynarStatus: string | null = null;
  let neynarError: string | null = null;

  if (record?.signerUuid) {
    const lookup = await getCachedNeynarSignerStatus(record.signerUuid, fid);
    if (lookup.ok) {
      neynarPermissions = lookup.permissions ?? null;
      neynarStatus = lookup.status ?? null;
      if (existingPermissions.length === 0 && neynarPermissions?.length) {
        await setSignerRecord({
          fid,
          signerUuid: record.signerUuid,
          signerPermissions: neynarPermissions,
        });
      }
    } else {
      neynarError = lookup.error;
    }
  }

  return {
    fid,
    hasSigner: Boolean(record),
    signerPermissions,
    neynarPermissions,
    neynarStatus,
    neynarError,
    updatedAt: record?.updatedAt ?? null,
  };
}
