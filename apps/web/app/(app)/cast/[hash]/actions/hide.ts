"use server";

import prisma from "@/lib/server/db/cobuild-db-client";
import { castHashToBuffer } from "@/lib/domains/rules/cast-rules/normalize";
import { updateThreadStatsForRoots } from "@/lib/integrations/farcaster/casts/thread-stats";
import { COBUILD_CHANNEL_URL } from "@/lib/integrations/farcaster/casts/shared";
import {
  normalizeReason,
  revalidateModerationTags,
  requireGlobalAdmin,
  type HideResult,
} from "./helpers";

export async function hideCast(payload: { castHash: string; reason: string }): Promise<HideResult> {
  const auth = await requireGlobalAdmin();
  if (!auth.ok) return auth;

  const reason = normalizeReason(payload.reason);
  if (!reason) return { ok: false, error: "Add a reason before hiding." };

  const hashBuffer = castHashToBuffer(payload.castHash);
  if (!hashBuffer) {
    return { ok: false, error: "Invalid cast hash." };
  }
  const hashId = hashBuffer as Uint8Array<ArrayBuffer>;

  const cast = await prisma.$primary().farcasterCast.findFirst({
    where: { hash: hashId, rootParentUrl: COBUILD_CHANNEL_URL },
    select: {
      hash: true,
      parentHash: true,
      rootParentHash: true,
      fid: true,
      hiddenAt: true,
    },
  });
  if (!cast) {
    return { ok: false, error: "Cast not found." };
  }
  if (cast.hiddenAt) {
    return { ok: false, error: "Cast already hidden." };
  }

  const hiddenAt = new Date();

  const updateResult = await prisma.farcasterCast.updateMany({
    where: {
      hash: hashId,
      rootParentUrl: COBUILD_CHANNEL_URL,
      hiddenAt: null,
    },
    data: {
      hiddenAt,
      hiddenBy: auth.address,
      hiddenReason: reason,
    },
  });

  if (updateResult.count === 0) {
    return { ok: false, error: "Cast already hidden." };
  }

  const rootHashBytes = cast.parentHash ? (cast.rootParentHash ?? cast.parentHash) : cast.hash;
  const rootHashBuffer = Buffer.from(rootHashBytes);
  await updateThreadStatsForRoots([rootHashBuffer]);
  revalidateModerationTags(cast.fid ? Number(cast.fid) : null);

  return { ok: true };
}

export async function hideFarcasterUser(payload: {
  fid: number;
  reason: string;
}): Promise<HideResult> {
  const auth = await requireGlobalAdmin();
  if (!auth.ok) return auth;

  const reason = normalizeReason(payload.reason);
  if (!reason) return { ok: false, error: "Add a reason before hiding." };

  const fidValue = Number(payload.fid);
  if (!Number.isInteger(fidValue) || fidValue <= 0) {
    return { ok: false, error: "Invalid Farcaster fid." };
  }
  const fidBigInt = BigInt(fidValue);

  const profile = await prisma.farcasterProfile.findUnique({
    where: { fid: fidBigInt },
    select: { hiddenAt: true },
  });

  if (!profile) {
    return { ok: false, error: "Farcaster user not found." };
  }
  if (profile.hiddenAt) {
    return { ok: false, error: "User already hidden." };
  }

  const rootRows = await prisma.$primary().$queryRaw<Array<{ rootHash: Buffer | null }>>`
    SELECT DISTINCT COALESCE(c.root_parent_hash, c.hash) AS "rootHash"
    FROM farcaster.casts c
    WHERE c.fid = ${fidBigInt}
      AND c.root_parent_url = ${COBUILD_CHANNEL_URL}
      AND c.deleted_at IS NULL
  `;

  const hiddenAt = new Date();

  await prisma.farcasterProfile.updateMany({
    where: { fid: fidBigInt, hiddenAt: null },
    data: {
      hiddenAt,
      hiddenBy: auth.address,
      hiddenReason: reason,
    },
  });

  await prisma.farcasterCast.updateMany({
    where: {
      fid: fidBigInt,
      rootParentUrl: COBUILD_CHANNEL_URL,
      hiddenAt: null,
    },
    data: {
      hiddenAt,
      hiddenBy: auth.address,
      hiddenReason: reason,
    },
  });

  await updateThreadStatsForRoots(rootRows.map((row) => row.rootHash));
  revalidateModerationTags(fidValue);

  return { ok: true };
}
