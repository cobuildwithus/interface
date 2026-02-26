import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/server/db/cobuild-db-client";
import { castHashToBuffer, normalizeCastHash } from "@/lib/domains/rules/cast-rules/normalize";
import { normalizeFid } from "@/lib/integrations/farcaster/signer-utils";
import { neynarFetchCastByHash, type NeynarCast } from "@/lib/integrations/farcaster/neynar-client";
import { COBUILD_CHANNEL_URL } from "./shared";
import { updateThreadStatsForRoots } from "./thread-stats";

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;

type NeynarCastEmbed = NonNullable<NonNullable<NeynarCast["embeds"]>[number]>;
type NeynarMentionRange = NonNullable<NonNullable<NeynarCast["mentioned_profiles_ranges"]>[number]>;
type NeynarMentionProfile = NonNullable<NonNullable<NeynarCast["mentioned_profiles"]>[number]>;
type CastEmbedInput = { url: string } | { castId: { fid: number; hash: string } };

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toBytesId(buffer: Buffer | null): Uint8Array<ArrayBuffer> | null {
  return buffer ? (buffer as Uint8Array<ArrayBuffer>) : null;
}

function stripMentionsFromText(
  text: string,
  ranges: NeynarCast["mentioned_profiles_ranges"]
): string {
  const list = asArray(ranges);
  if (list.length === 0) {
    return text;
  }

  const resultSegments: { start: number; end: number }[] = [];
  for (const range of list) {
    const start = typeof range?.start === "number" ? Math.trunc(range.start) : NaN;
    const end = typeof range?.end === "number" ? Math.trunc(range.end) : NaN;
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (end <= start) continue;
    resultSegments.push({ start, end });
  }

  if (resultSegments.length === 0) {
    return text;
  }

  const maxIndex = text.length;
  let sanitized = text;
  for (const segment of resultSegments.sort((a, b) => b.start - a.start)) {
    const start = Math.max(0, Math.min(segment.start, maxIndex));
    const end = Math.max(start, Math.min(segment.end, maxIndex));
    sanitized = `${sanitized.slice(0, start)}${sanitized.slice(end)}`;
  }

  return sanitized;
}

function extractMentionFids(profiles: NeynarCast["mentioned_profiles"]): bigint[] {
  const list = asArray(profiles);
  if (list.length === 0) {
    return [];
  }

  const fids: bigint[] = [];
  for (const profile of list as NeynarMentionProfile[]) {
    const fid = normalizeFid(profile?.fid);
    if (fid) fids.push(BigInt(fid));
  }
  return fids;
}

function extractMentionPositions(ranges: NeynarCast["mentioned_profiles_ranges"]): number[] {
  const list = asArray(ranges);
  if (list.length === 0) {
    return [];
  }

  const positions: number[] = [];
  for (const range of list as NeynarMentionRange[]) {
    const start = range?.start;
    if (typeof start === "number" && Number.isFinite(start)) {
      positions.push(Math.trunc(start));
    }
  }
  return positions;
}

function normalizeEmbedCastId(embed: NeynarCastEmbed): { fid: number; hash: string } | null {
  const fid = normalizeFid(embed?.cast_id?.fid ?? embed?.cast?.author?.fid ?? null);
  const hash = normalizeCastHash(embed?.cast_id?.hash ?? embed?.cast?.hash ?? null);

  if (!fid || !hash) {
    return null;
  }

  return { fid, hash };
}

function mapEmbeds(embeds: NeynarCast["embeds"]): CastEmbedInput[] {
  const list = asArray(embeds);
  if (list.length === 0) {
    return [];
  }

  const normalized: CastEmbedInput[] = [];

  for (const embed of list as NeynarCastEmbed[]) {
    if (!embed) continue;

    const url = typeof embed.url === "string" ? embed.url.trim() : "";
    if (url) {
      normalized.push({ url });
      continue;
    }

    const castId = normalizeEmbedCastId(embed);
    if (castId) {
      normalized.push({ castId });
    }
  }

  return normalized;
}

async function fetchCastWithRetry(hash: string): Promise<NeynarCast | null> {
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt += 1) {
    const result = await neynarFetchCastByHash(hash, { timeoutMs: 12_000 });
    if (result.ok) return result.cast;
    if (result.deleted) return null;
    if (attempt < RETRY_ATTEMPTS - 1) {
      await sleep(RETRY_DELAY_MS);
    }
  }
  return null;
}

export async function upsertCobuildCastByHash(hash: string): Promise<boolean> {
  const cast = await fetchCastWithRetry(hash);
  if (!cast) return false;

  const {
    root_parent_url: rootParentUrlRaw,
    hash: castHash,
    author,
    parent_hash: parentHashRaw,
    parent_author: parentAuthor,
    parent_url: parentUrl,
    thread_hash: threadHash,
    timestamp,
    text: castText,
    embeds,
    mentioned_profiles: mentionedProfiles,
    mentioned_profiles_ranges: mentionedProfileRanges,
  } = cast;

  const rootParentUrl = rootParentUrlRaw ?? null;
  if (rootParentUrl !== COBUILD_CHANNEL_URL) {
    return false;
  }

  const hashBuffer = castHashToBuffer(castHash);
  if (!hashBuffer) return false;
  const hashId = hashBuffer as Uint8Array<ArrayBuffer>;

  const fid = normalizeFid(author?.fid);
  if (!fid) return false;

  const parentHash = toBytesId(parentHashRaw ? castHashToBuffer(parentHashRaw) : null);
  const parentFid = normalizeFid(parentAuthor?.fid);
  const rootParentHashBuffer = castHashToBuffer(threadHash ?? castHash) ?? hashBuffer;
  const rootParentHash = toBytesId(rootParentHashBuffer);
  const castTimestamp = parseTimestamp(timestamp);
  const text = typeof castText === "string" ? castText : "";
  const sanitizedText = stripMentionsFromText(text, mentionedProfileRanges);
  const embedsArray = mapEmbeds(embeds);
  const embedsValue = embedsArray.length > 0 ? (embedsArray as Prisma.JsonArray) : undefined;
  const mentionedFids = extractMentionFids(mentionedProfiles);
  const mentionsPositions = extractMentionPositions(mentionedProfileRanges);
  const now = new Date();

  const updateData = {
    updatedAt: now,
    fid: BigInt(fid),
    parentHash,
    parentFid: parentFid ? BigInt(parentFid) : null,
    parentUrl: parentUrl ?? null,
    text: sanitizedText,
    ...(embedsValue ? { embedsArray: embedsValue } : {}),
    rootParentHash,
    rootParentUrl,
    mentionedFids,
    mentionsPositions,
    ...(castTimestamp ? { castTimestamp } : {}),
  };

  await prisma.farcasterCast.upsert({
    where: { hash: hashId },
    create: {
      hash: hashId,
      embedSummaries: [],
      castTimestamp,
      ...updateData,
    },
    update: updateData,
  });

  await updateThreadStatsForRoots([rootParentHashBuffer]);

  return true;
}
