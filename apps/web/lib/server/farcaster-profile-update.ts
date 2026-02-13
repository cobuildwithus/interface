import "server-only";

import { revalidateTag } from "next/cache";
import prisma from "@/lib/server/db/cobuild-db-client";
import { getSession } from "@/lib/domains/auth/session";
import { neynarUpdateUserProfile } from "@/lib/integrations/farcaster/neynar-client";
import { getSignerRecord } from "@/lib/integrations/farcaster/signer-store";
import { getCachedNeynarSignerStatus } from "@/lib/integrations/farcaster/signer-status";
import { upsertLinkedAccount } from "@/lib/domains/auth/linked-accounts/store";

const UPDATE_PROFILE_TAG = "update_profile";
const WRITE_ALL_TAG = "write_all";

export type UpdateFarcasterProfileResult =
  | { ok: true; displayName?: string; pfpUrl?: string }
  | { ok: false; error: string; status: number };

function hasUpdateProfilePermission(permissions: string[] | null): boolean {
  if (!permissions || permissions.length === 0) return false;
  return permissions.some((permission) => {
    const normalized = permission.toLowerCase();
    return (
      normalized === UPDATE_PROFILE_TAG ||
      normalized === WRITE_ALL_TAG ||
      normalized === "writeall" ||
      (normalized.includes("update") && normalized.includes("profile")) ||
      (normalized.includes("write") && normalized.includes("all"))
    );
  });
}

function parseStringValue(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

export async function updateFarcasterProfile(payload: {
  displayName?: string | null;
  pfpUrl?: string | null;
}): Promise<UpdateFarcasterProfileResult> {
  const displayName = parseStringValue(payload.displayName);
  const pfpUrl = parseStringValue(payload.pfpUrl);
  const hasDisplayName = displayName !== undefined;
  const hasPfpUrl = pfpUrl !== undefined;

  if (!hasDisplayName && !hasPfpUrl) {
    return { ok: false, error: "Nothing to update.", status: 400 };
  }

  if (hasDisplayName && displayName.length === 0) {
    return { ok: false, error: "Display name cannot be empty.", status: 400 };
  }

  if (hasPfpUrl && pfpUrl.length === 0) {
    return { ok: false, error: "Profile photo URL cannot be empty.", status: 400 };
  }

  if (hasPfpUrl) {
    try {
      const url = new URL(pfpUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return { ok: false, error: "Profile photo URL must be http(s).", status: 400 };
      }
    } catch {
      return { ok: false, error: "Profile photo URL is invalid.", status: 400 };
    }
  }

  const session = await getSession();
  const address = session.address;
  const fid = session.farcaster?.fid ?? null;

  if (!address) {
    return { ok: false, error: "Connect a wallet before updating profile.", status: 401 };
  }

  if (!fid) {
    return { ok: false, error: "Connect a Farcaster account to update profile.", status: 401 };
  }

  const signerRecord = await getSignerRecord(fid);
  if (!signerRecord) {
    return { ok: false, error: "Farcaster signer not connected.", status: 403 };
  }

  const signerStatus = await getCachedNeynarSignerStatus(signerRecord.signerUuid, fid);
  if (!signerStatus.ok) {
    return {
      ok: false,
      error: signerStatus.error,
      status: signerStatus.status ?? 502,
    };
  }

  if (signerStatus.status && signerStatus.status !== "approved") {
    return {
      ok: false,
      error: `Signer not approved (status=${signerStatus.status}).`,
      status: 403,
    };
  }

  const permissions = signerStatus.permissions ?? signerRecord.signerPermissions ?? null;
  if (!hasUpdateProfilePermission(permissions)) {
    return { ok: false, error: "Signer is missing profile update permission.", status: 403 };
  }

  const updateResult = await neynarUpdateUserProfile({
    signerUuid: signerRecord.signerUuid,
    displayName: hasDisplayName ? displayName : undefined,
    pfpUrl: hasPfpUrl ? pfpUrl : undefined,
  });

  if (!updateResult.ok) {
    return { ok: false, error: updateResult.error, status: updateResult.status ?? 502 };
  }

  await upsertLinkedAccount({
    ownerAddress: address,
    platform: "farcaster",
    platformId: String(fid),
    username: session.farcaster?.username ?? null,
    displayName: hasDisplayName ? displayName : undefined,
    avatarUrl: hasPfpUrl ? pfpUrl : undefined,
    source: "neynar_signer",
    canPost: true,
  });

  const profileUpdate: { displayName?: string; avatarUrl?: string; updatedAt: Date } = {
    updatedAt: new Date(),
    ...(hasDisplayName ? { displayName } : {}),
    ...(hasPfpUrl ? { avatarUrl: pfpUrl } : {}),
  };

  await prisma.farcasterProfile.updateMany({
    where: { fid: BigInt(fid) },
    data: profileUpdate,
  });

  revalidateTag("farcaster-profile", "default");
  revalidateTag("profile-v4", "default");

  return {
    ok: true,
    ...(hasDisplayName ? { displayName } : {}),
    ...(hasPfpUrl ? { pfpUrl } : {}),
  };
}
