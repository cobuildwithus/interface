"use server";

import { getSession } from "@/lib/domains/auth/session";
import { revalidateTag } from "next/cache";
import { saveVerifiedAddressForFid } from "@/lib/integrations/farcaster/save-verified-address";
import {
  isValidSignerUuid,
  normalizeFid,
  normalizeSignerPermissions,
} from "@/lib/integrations/farcaster/signer-utils";
import { setSignerRecord } from "@/lib/integrations/farcaster/signer-store";
import {
  getSignerStatusCacheTag,
  getSignerStatusUuidCacheTag,
} from "@/lib/integrations/farcaster/signer-status";
import { upsertLinkedAccount } from "@/lib/domains/auth/linked-accounts/store";

export type NeynarSigninPayload = {
  fid: number | string;
  signer_uuid: string;
  signer_permissions: string[];
};

export async function handleNeynarSignin(payload: NeynarSigninPayload) {
  const session = await getSession();
  const address = session.address;
  if (!address) {
    throw new Error("Connect a wallet before linking Farcaster.");
  }

  const fid = normalizeFid(payload.fid);
  if (!fid) {
    throw new Error("Invalid Farcaster ID.");
  }

  if (session.farcaster?.fid && session.farcaster.fid !== fid) {
    throw new Error("Farcaster account does not match your current session.");
  }

  if (!isValidSignerUuid(payload.signer_uuid)) {
    throw new Error("Invalid signer UUID.");
  }

  const signerPermissions = normalizeSignerPermissions(payload.signer_permissions);
  if (!signerPermissions) {
    throw new Error("Invalid signer permissions.");
  }

  await setSignerRecord({
    fid,
    signerUuid: payload.signer_uuid,
    signerPermissions,
  });

  await upsertLinkedAccount({
    ownerAddress: address,
    platform: "farcaster",
    platformId: String(fid),
    username: session.farcaster?.username ?? null,
    displayName: session.farcaster?.displayName ?? null,
    avatarUrl: session.farcaster?.pfp ?? null,
    source: "neynar_signer",
    canPost: true,
  });

  await saveVerifiedAddressForFid(fid, address);
  revalidateTag("farcaster-profile", "default");
  revalidateTag(getSignerStatusCacheTag(fid), "default");
  revalidateTag(getSignerStatusUuidCacheTag(payload.signer_uuid), "default");

  return { fid };
}
