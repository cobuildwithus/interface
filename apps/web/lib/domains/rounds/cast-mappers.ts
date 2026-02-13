import "server-only";

import { Prisma } from "@/generated/prisma/client";
import {
  insertMentions,
  parseMentionProfiles,
  type MentionProfileInput,
} from "@/lib/integrations/farcaster/mentions";
import type { JsonRecord, JsonValue } from "@/lib/shared/json";
import { toFiniteNumber } from "@/lib/shared/numbers";
import type { FarcasterCast } from "@/types/farcaster";

type PrismaJsonRecord = Record<string, Prisma.JsonValue>;

function isRecord(value: Prisma.JsonValue | null | undefined): value is PrismaJsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toJsonRecord(value: Prisma.JsonValue | null | undefined): JsonRecord {
  if (!isRecord(value)) return {};
  const record: JsonRecord = {};
  for (const [key, raw] of Object.entries(value)) {
    if (raw !== undefined) record[key] = raw as JsonValue;
  }
  return record;
}

function parseEmbeds(embedsArray: Prisma.JsonValue | null | undefined): FarcasterCast["embeds"] {
  if (!Array.isArray(embedsArray)) return [];

  return embedsArray.map((e) => {
    if (isRecord(e) && typeof e.url === "string") {
      return { url: e.url };
    }
    return {};
  });
}

type CastRowForMapping = {
  hash: Buffer;
  text: string | null;
  castTimestamp: Date | null;
  embedsArray: Prisma.JsonValue | null;
  mentionsPositions: number[] | null;
  mentionProfiles: Array<MentionProfileInput | null> | null;
  fid: bigint;
  authorFname: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  authorNeynarScore: number | null;
  aiOutputId: bigint | null;
  aiOutputModel: string | null;
  aiOutputOutput: Prisma.JsonValue | null;
  aiOutputCreatedAt: Date | null;
  evalShare: Prisma.Decimal | number | string | bigint | null;
  evalRank: bigint | null;
  evalWinRate: number | null;
};

export function mapCastRowToFarcasterCast(row: CastRowForMapping): FarcasterCast {
  const hashHex = Buffer.from(row.hash).toString("hex");

  const mentionedProfiles = parseMentionProfiles(row.mentionProfiles);

  const rawText = row.text ?? "";
  const text = insertMentions(rawText, row.mentionsPositions ?? [], mentionedProfiles);

  const aiOutput: FarcasterCast["aiOutput"] =
    row.aiOutputId !== null
      ? {
          id: row.aiOutputId.toString(),
          model: row.aiOutputModel ?? "",
          output: toJsonRecord(row.aiOutputOutput),
          createdAt: row.aiOutputCreatedAt?.toISOString() ?? "",
        }
      : null;

  const share = toFiniteNumber(row.evalShare);
  const evalScore: FarcasterCast["evalScore"] =
    share !== null
      ? {
          share,
          rank: row.evalRank !== null ? Number(row.evalRank) : null,
          winRate: row.evalWinRate,
        }
      : null;

  return {
    hash: `0x${hashHex}`,
    author: {
      fid: Number(row.fid),
      username: row.authorFname ?? null,
      display_name: row.authorDisplayName ?? null,
      pfp_url: row.authorAvatarUrl ?? null,
      power_badge: (row.authorNeynarScore ?? 0) >= 0.9,
      neynar_score: row.authorNeynarScore,
    },
    text,
    timestamp: row.castTimestamp?.toISOString() ?? new Date().toISOString(),
    embeds: parseEmbeds(row.embedsArray),
    reactions: null,
    replies: null,
    mentioned_profiles: mentionedProfiles.map((mp) => ({ fid: mp.fid })),
    mentions_positions: row.mentionsPositions ?? [],
    aiOutput,
    evalScore,
  };
}
