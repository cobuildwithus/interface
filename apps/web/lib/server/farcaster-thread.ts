import "server-only";

import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/domains/auth/session";
import { upsertCobuildCastByHash } from "@/lib/integrations/farcaster/casts/upsert";
import { neynarPublishCast } from "@/lib/integrations/farcaster/neynar-client";
import { getSignerRecord } from "@/lib/integrations/farcaster/signer-store";
import { hasCastPermission } from "@/lib/integrations/farcaster/signer-utils";
import {
  COBUILD_CHANNEL_URL,
  DISCUSSION_CACHE_TAG,
  THREAD_CACHE_TAG,
} from "@/lib/integrations/farcaster/casts/shared";
import type { Result } from "@/lib/server/result";
import { isRecord } from "@/lib/server/validation";
import {
  buildIdemKey,
  normalizeOptionalUrl,
  normalizeOptionalUrlArray,
} from "@/lib/server/farcaster-post-utils";
import type { JsonValue } from "@/lib/shared/json";

const CHARACTER_LIMIT = 1024;
const THREAD_LIMIT = CHARACTER_LIMIT * 10;
const THREAD_RETRIES_ON_429 = 8;
const POST_DELAY_MS = 300;
const ZERO_WIDTH_SPACE = "\u200b";
const SAFE_BREAK_CHARS = ["/", "-", "_", "?", "&", "="] as const;
const SENTENCE_BREAK_REGEX = /[.!?]["')\]]?(?=\s|$)/g;

type ThreadPayload = {
  title?: string | null;
  content?: string | null;
  attachmentUrl?: string | null;
  attachmentUrls?: Array<string | null | undefined> | null;
  embedUrl?: string | null;
};

type ThreadResult = Result<{ hash: string }>;

type BreakCandidate = { index: number; skip: number } | null;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function findBreakCandidate(text: string, limit: number): BreakCandidate {
  const head = text.slice(0, limit);

  const paragraphIndex = head.lastIndexOf("\r\n\r\n");
  if (paragraphIndex >= 0) return { index: paragraphIndex, skip: 4 };

  const paragraphLfIndex = head.lastIndexOf("\n\n");
  if (paragraphLfIndex >= 0) return { index: paragraphLfIndex, skip: 2 };

  const newlineIndex = head.lastIndexOf("\n");
  if (newlineIndex >= 0) {
    const hasCr = newlineIndex > 0 && head[newlineIndex - 1] === "\r";
    return { index: hasCr ? newlineIndex - 1 : newlineIndex, skip: hasCr ? 2 : 1 };
  }

  let lastSentence: RegExpExecArray | null = null;
  SENTENCE_BREAK_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SENTENCE_BREAK_REGEX.exec(head)) !== null) {
    lastSentence = match;
  }
  if (lastSentence) {
    return { index: lastSentence.index + lastSentence[0].length, skip: 0 };
  }

  for (let i = head.length - 1; i >= 0; i -= 1) {
    if (/\s/.test(head[i] ?? "")) {
      return { index: i, skip: 1 };
    }
  }

  let safeIndex = -1;
  for (const char of SAFE_BREAK_CHARS) {
    const index = head.lastIndexOf(char);
    if (index > safeIndex) safeIndex = index;
  }
  if (safeIndex >= 0) return { index: safeIndex + 1, skip: 0 };

  return null;
}

function splitThreadText(text: string, limit: number = CHARACTER_LIMIT): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= limit) {
      chunks.push(remaining);
      break;
    }

    const candidate = findBreakCandidate(remaining, limit);
    if (!candidate || candidate.index <= 0) {
      const safeIndex = Math.max(1, limit - 1);
      const chunk = `${remaining.slice(0, safeIndex).trimEnd()}${ZERO_WIDTH_SPACE}`;
      chunks.push(chunk);
      remaining = remaining.slice(safeIndex);
      continue;
    }

    const chunk = remaining.slice(0, candidate.index).trimEnd();
    if (!chunk) {
      const safeIndex = Math.max(1, limit - 1);
      const fallback = `${remaining.slice(0, safeIndex).trimEnd()}${ZERO_WIDTH_SPACE}`;
      chunks.push(fallback);
      remaining = remaining.slice(safeIndex);
      continue;
    }

    chunks.push(chunk);
    remaining = remaining.slice(candidate.index + candidate.skip).trimStart();
  }

  return chunks;
}

export async function createThreadPost(
  payload: JsonValue | null | undefined
): Promise<ThreadResult> {
  const body: ThreadPayload = isRecord(payload) ? payload : {};

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return { ok: false, status: 400, error: "Title is required." };
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return { ok: false, status: 400, error: "Content is required." };
  }

  let attachmentUrls: string[] = [];
  if (body.attachmentUrls !== undefined) {
    const normalized = normalizeOptionalUrlArray(body.attachmentUrls);
    if (!normalized) {
      return { ok: false, status: 400, error: "Invalid attachment URLs." };
    }
    attachmentUrls = normalized;
  } else {
    const attachmentUrl = normalizeOptionalUrl(body.attachmentUrl);
    if ((body.attachmentUrl ?? null) !== null && !attachmentUrl) {
      return { ok: false, status: 400, error: "Invalid attachment URL." };
    }
    if (attachmentUrl) attachmentUrls = [attachmentUrl];
  }

  const embedUrl = normalizeOptionalUrl(body.embedUrl);
  if ((body.embedUrl ?? null) !== null && !embedUrl) {
    return { ok: false, status: 400, error: "Invalid embed URL." };
  }

  const maxEmbeds = 2;
  const totalEmbeds = attachmentUrls.length + (embedUrl ? 1 : 0);
  if (totalEmbeds > maxEmbeds) {
    return {
      ok: false,
      status: 400,
      error: embedUrl
        ? "Too many attachments. Goal posts support 1 image (plus the goal link)."
        : "Too many attachments. You can attach up to 2 images.",
    };
  }

  const combined = `${title}\n\n${content}`;
  if (combined.length > THREAD_LIMIT) {
    return { ok: false, status: 400, error: "Post is too long." };
  }

  const session = await getSession();
  const fid = session.farcaster?.fid ?? null;
  if (!fid) {
    return { ok: false, status: 401, error: "Connect a Farcaster account to post." };
  }

  const signerRecord = await getSignerRecord(fid);
  if (!signerRecord) {
    return { ok: false, status: 403, error: "Farcaster signer not connected." };
  }

  if (!hasCastPermission(signerRecord.signerPermissions)) {
    return { ok: false, status: 403, error: "Farcaster signer missing cast permission." };
  }

  const chunks = splitThreadText(combined, CHARACTER_LIMIT);
  if (chunks.length === 0) {
    return { ok: false, status: 400, error: "Post is empty." };
  }

  const embedUrls =
    embedUrl && !attachmentUrls.includes(embedUrl) ? [...attachmentUrls, embedUrl] : attachmentUrls;
  const embeds = embedUrls.map((url) => ({ url }));

  let parentHash: string | null = COBUILD_CHANNEL_URL;
  let rootHash: string | null = null;

  for (let i = 0; i < chunks.length; i += 1) {
    const text = chunks[i];
    if (text.length > CHARACTER_LIMIT) {
      return { ok: false, status: 400, error: "Post segment is too long." };
    }

    if (i > 0) {
      await sleep(POST_DELAY_MS);
    }

    const publishResult = await neynarPublishCast({
      signerUuid: signerRecord.signerUuid,
      text,
      parentHash,
      parentAuthorFid: i === 0 ? undefined : fid,
      idem: buildIdemKey(),
      embeds: i === 0 && embeds.length > 0 ? embeds : undefined,
      retriesOn429: THREAD_RETRIES_ON_429,
    });

    if (!publishResult.ok) {
      console.error("[farcaster/thread] publish failed", {
        status: publishResult.status,
        error: publishResult.error,
        index: i,
      });
      return {
        ok: false,
        status: publishResult.status ?? 500,
        error: publishResult.error || "Failed to publish thread.",
      };
    }

    if (i === 0) rootHash = publishResult.hash;
    parentHash = publishResult.hash;

    const upserted = await upsertCobuildCastByHash(publishResult.hash);
    if (!upserted) {
      console.warn("[farcaster/thread] upsert skipped after publish", {
        hash: publishResult.hash,
        index: i,
      });
    }
  }

  if (!rootHash) {
    return { ok: false, status: 500, error: "Failed to publish thread." };
  }

  revalidateTag(DISCUSSION_CACHE_TAG, "seconds");
  revalidateTag(THREAD_CACHE_TAG, "seconds");

  return { ok: true, data: { hash: rootHash } };
}
