"use server";

import { getSession } from "@/lib/domains/auth/session";
import prisma from "@/lib/server/db/cobuild-db-client";
import { castHashToBuffer } from "@/lib/domains/rules/cast-rules/normalize";
import { neynarDeleteCast } from "@/lib/integrations/farcaster/neynar-client";
import { getCobuildThreadMergeGroup } from "@/lib/integrations/farcaster/casts/thread";
import { updateThreadStatsForRoots } from "@/lib/integrations/farcaster/casts/thread-stats";
import { getSignerRecord } from "@/lib/integrations/farcaster/signer-store";
import { COBUILD_CHANNEL_URL, bufferToHash } from "@/lib/integrations/farcaster/casts/shared";
import { hasDeleteCastPermission, revalidateModerationTags, type DeleteResult } from "./helpers";

export async function deleteCast(payload: { castHash: string }): Promise<DeleteResult> {
  const session = await getSession();
  const fid = session.farcaster?.fid ?? null;
  if (!fid) {
    return { ok: false, error: "Connect a Farcaster account to delete posts." };
  }

  const signerRecord = await getSignerRecord(fid);
  if (!signerRecord) {
    return { ok: false, error: "Farcaster signer not connected." };
  }
  if (!hasDeleteCastPermission(signerRecord.signerPermissions)) {
    return { ok: false, error: "Farcaster signer missing delete permission." };
  }

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
      deletedAt: true,
    },
  });
  if (!cast) {
    return { ok: false, error: "Cast not found." };
  }
  if (cast.deletedAt) {
    return { ok: false, error: "Cast already deleted." };
  }

  const castFid = cast.fid ? Number(cast.fid) : null;
  if (!castFid || castFid !== fid) {
    return { ok: false, error: "You can only delete your own posts." };
  }

  const rootHashBytes = cast.parentHash ? (cast.rootParentHash ?? cast.parentHash) : cast.hash;
  const rootHashBuffer = Buffer.from(rootHashBytes);
  const rootHash = bufferToHash(rootHashBuffer);
  const mergeGroup = rootHash ? await getCobuildThreadMergeGroup(rootHash, payload.castHash) : null;
  const deleteHashes = Array.from(new Set(mergeGroup ?? [payload.castHash]));
  const hashIds = deleteHashes
    .map((hash) => castHashToBuffer(hash))
    .filter((hash): hash is Buffer => Boolean(hash))
    .map((hash) => hash as Uint8Array<ArrayBuffer>);

  if (hashIds.length === 0) {
    return { ok: false, error: "Invalid cast hash." };
  }

  for (const hash of deleteHashes) {
    const response = await neynarDeleteCast({
      signerUuid: signerRecord.signerUuid,
      castHash: hash,
    });

    if (!response.ok) {
      return { ok: false, error: response.error };
    }
  }

  const deletedAt = new Date();
  const updateResult = await prisma.farcasterCast.updateMany({
    where: {
      hash: { in: hashIds },
      rootParentUrl: COBUILD_CHANNEL_URL,
      deletedAt: null,
    },
    data: {
      deletedAt,
    },
  });

  if (updateResult.count === 0) {
    return { ok: false, error: "Cast already deleted." };
  }

  await updateThreadStatsForRoots([rootHashBuffer]);
  revalidateModerationTags(castFid);

  return { ok: true };
}
