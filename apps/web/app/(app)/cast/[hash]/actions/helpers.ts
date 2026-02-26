import { revalidateTag } from "next/cache";
import { getUser } from "@/lib/domains/auth/session";
import { isGlobalAdmin } from "@/lib/config/admins";
import { normalizeSignerPermissions } from "@/lib/integrations/farcaster/signer-utils";
import { DISCUSSION_CACHE_TAG, THREAD_CACHE_TAG } from "@/lib/integrations/farcaster/casts/shared";
import { invalidateCobuildActivityCache } from "@/lib/integrations/farcaster/activity";

export type HideResult = { ok: true } | { ok: false; error: string };
export type DeleteResult = { ok: true } | { ok: false; error: string };

export function normalizeReason(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function revalidateModerationTags(fid?: number | null) {
  revalidateTag(DISCUSSION_CACHE_TAG, "seconds");
  revalidateTag(THREAD_CACHE_TAG, "seconds");
  if (fid != null) {
    revalidateTag(`farcaster-activity:${fid}`, "seconds");
    void invalidateCobuildActivityCache(fid);
  }
}

export function hasDeleteCastPermission(permissions: string[] | null): boolean {
  const normalized = normalizeSignerPermissions(permissions) ?? [];
  return normalized.includes("write_all") || normalized.includes("delete_cast");
}

export async function requireGlobalAdmin(): Promise<
  { ok: true; address: `0x${string}` } | { ok: false; error: string }
> {
  const userAddress = await getUser();
  if (!userAddress) {
    return { ok: false, error: "Sign in to moderate casts." };
  }
  if (!isGlobalAdmin(userAddress)) {
    return { ok: false, error: "You are not allowed to moderate casts." };
  }

  return { ok: true, address: userAddress };
}
