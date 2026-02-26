import "server-only";

import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/domains/auth/session";
import { upsertCobuildCastByHash } from "@/lib/integrations/farcaster/casts/upsert";
import { DISCUSSION_CACHE_TAG, THREAD_CACHE_TAG } from "@/lib/integrations/farcaster/casts/shared";
import { neynarPublishCast } from "@/lib/integrations/farcaster/neynar-client";
import { isFullCastHash } from "@/lib/integrations/farcaster/parse-cast-url";
import { getSignerRecord } from "@/lib/integrations/farcaster/signer-store";
import { hasCastPermission, normalizeFid } from "@/lib/integrations/farcaster/signer-utils";
import type { Result } from "@/lib/server/result";
import { isRecord } from "@/lib/server/validation";
import { buildIdemKey, normalizeOptionalUrl } from "@/lib/server/farcaster-post-utils";
import type { JsonValue } from "@/lib/shared/json";

const CHARACTER_LIMIT = 1024;

type ReplyPayload = {
  text?: string | null;
  parentHash?: string | null;
  parentAuthorFid?: string | number | null;
  attachmentUrl?: string | null;
};

type ReplyResult = Result<{ hash: string }>;

function normalizeOptionalFid(value: string | number | null | undefined): number | null {
  return value === undefined || value === null ? null : normalizeFid(value);
}

export async function createReplyPost(payload: JsonValue | null | undefined): Promise<ReplyResult> {
  const body: ReplyPayload = isRecord(payload) ? payload : {};

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return { ok: false, status: 400, error: "Reply text is required." };
  }

  if (text.length > CHARACTER_LIMIT) {
    return { ok: false, status: 400, error: "Reply is too long." };
  }

  const parentHash = typeof body.parentHash === "string" ? body.parentHash.trim() : "";
  if (!isFullCastHash(parentHash)) {
    return { ok: false, status: 400, error: "Invalid parent cast hash." };
  }

  const parentAuthorFid = normalizeOptionalFid(body.parentAuthorFid);
  if ((body.parentAuthorFid ?? null) !== null && !parentAuthorFid) {
    return { ok: false, status: 400, error: "Invalid parent author fid." };
  }

  const attachmentUrl = normalizeOptionalUrl(body.attachmentUrl);
  if ((body.attachmentUrl ?? null) !== null && !attachmentUrl) {
    return { ok: false, status: 400, error: "Invalid attachment URL." };
  }

  const session = await getSession();
  const fid = session.farcaster?.fid ?? null;
  if (!fid) {
    return { ok: false, status: 401, error: "Connect a Farcaster account to post replies." };
  }

  const signerRecord = await getSignerRecord(fid);
  if (!signerRecord) {
    return { ok: false, status: 403, error: "Farcaster signer not connected." };
  }

  if (!hasCastPermission(signerRecord.signerPermissions)) {
    return { ok: false, status: 403, error: "Farcaster signer missing cast permission." };
  }

  const publishResult = await neynarPublishCast({
    signerUuid: signerRecord.signerUuid,
    text,
    parentHash,
    parentAuthorFid,
    idem: buildIdemKey(),
    embeds: attachmentUrl ? [{ url: attachmentUrl }] : undefined,
  });

  if (!publishResult.ok) {
    console.error("[farcaster/cast] publish failed", {
      status: publishResult.status,
      error: publishResult.error,
    });
    return {
      ok: false,
      status: publishResult.status ?? 500,
      error: publishResult.error || "Failed to publish reply.",
    };
  }

  const upserted = await upsertCobuildCastByHash(publishResult.hash);
  if (!upserted) {
    console.warn("[farcaster/cast] upsert skipped after publish", {
      hash: publishResult.hash,
    });
  }

  revalidateTag(DISCUSSION_CACHE_TAG, "seconds");
  revalidateTag(THREAD_CACHE_TAG, "seconds");

  return { ok: true, data: { hash: publishResult.hash } };
}
