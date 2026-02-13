import "server-only";

import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/server/db/cobuild-db-client";
import { mapCastRowToFarcasterCast } from "@/lib/domains/rounds/cast-mappers";
import type { MentionProfileInput } from "@/lib/integrations/farcaster/mentions";
import { getPrimaryAttachment, getTitleAndExcerpt } from "./attachments";
import {
  COBUILD_CHANNEL_URL,
  DISCUSSION_PAGE_SIZE,
  NEYNAR_SCORE_THRESHOLD,
  hasText,
  toNumber,
} from "./shared";
import type { DiscussionCastsPage, DiscussionSort, DiscussionSortDirection } from "./types";

const DEFAULT_DISCUSSION_SORT: DiscussionSort = "last";
const DEFAULT_DISCUSSION_SORT_DIRECTION: DiscussionSortDirection = "desc";
function normalizeDiscussionSort(value?: DiscussionSort | null): DiscussionSort {
  if (value === "replies" || value === "views" || value === "last") return value;
  return DEFAULT_DISCUSSION_SORT;
}

function normalizeDiscussionSortDirection(
  value?: DiscussionSortDirection | null
): DiscussionSortDirection {
  return value === "asc" ? "asc" : DEFAULT_DISCUSSION_SORT_DIRECTION;
}

function normalizeEmbedUrl(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

function getDiscussionOrderBy(sort: DiscussionSort, direction: DiscussionSortDirection) {
  const sortKey =
    sort === "replies"
      ? Prisma.sql`c.reply_count`
      : sort === "views"
        ? Prisma.sql`c.view_count`
        : Prisma.sql`COALESCE(c.last_activity_at, c.timestamp)`;
  const sortDirection = direction === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;

  return Prisma.sql`${sortKey} ${sortDirection} NULLS LAST, COALESCE(c.last_activity_at, c.timestamp) DESC NULLS LAST`;
}

type DiscussionCastRow = {
  hash: Buffer;
  text: string | null;
  castTimestamp: Date | null;
  embedsArray: Prisma.JsonValue | null;
  embedSummaries: string[] | null;
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
  replyCount: bigint | number | null;
  viewCount: bigint | number | null;
  lastReplyTimestamp: Date | null;
  lastReplyAuthorFname: string | null;
};

type DiscussionCountRow = {
  count: bigint | number | null;
};

export async function getCobuildDiscussionCastsPage(
  limit: number = DISCUSSION_PAGE_SIZE,
  offset: number = 0,
  sort: DiscussionSort = DEFAULT_DISCUSSION_SORT,
  sortDirection: DiscussionSortDirection = DEFAULT_DISCUSSION_SORT_DIRECTION,
  embedUrl?: string | null
): Promise<DiscussionCastsPage> {
  const resolvedSort = normalizeDiscussionSort(sort);
  const resolvedDirection = normalizeDiscussionSortDirection(sortDirection);
  const orderBy = getDiscussionOrderBy(resolvedSort, resolvedDirection);
  const resolvedEmbedUrl = normalizeEmbedUrl(embedUrl);
  const embedFilter = resolvedEmbedUrl
    ? Prisma.sql`AND c.embeds_array @> ${JSON.stringify([{ url: resolvedEmbedUrl }])}::jsonb`
    : Prisma.sql``;
  const baseWhere = Prisma.sql`
    WHERE c.deleted_at IS NULL
      AND c.hidden_at IS NULL
      AND c.parent_hash IS NULL
      AND c.root_parent_url = ${COBUILD_CHANNEL_URL}
      ${embedFilter}
      AND c.text IS NOT NULL
      AND btrim(c.text) <> ''
      AND c.fid IS NOT NULL
      AND p.hidden_at IS NULL
      AND p.neynar_user_score IS NOT NULL
      AND p.neynar_user_score >= ${NEYNAR_SCORE_THRESHOLD}
  `;

  const countRows = await prisma.$replica().$queryRaw<DiscussionCountRow[]>`
    SELECT COUNT(*)::bigint AS count
    FROM farcaster.casts c
    LEFT JOIN farcaster.profiles p ON p.fid = c.fid
    ${baseWhere}
  `;

  const totalCount = toNumber(countRows[0]?.count) ?? 0;
  const pageSize = Math.max(1, limit);
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  const safeOffset = Math.max(0, offset);

  const rows = await prisma.$replica().$queryRaw<DiscussionCastRow[]>`
    SELECT
      c.hash,
      c.text,
      c.timestamp AS "castTimestamp",
      c.embeds_array AS "embedsArray",
      c.embed_summaries AS "embedSummaries",
      c.mentions_positions_array AS "mentionsPositions",
      mp.profiles AS "mentionProfiles",
      c.fid,
      p.fname AS "authorFname",
      p.display_name AS "authorDisplayName",
      p.avatar_url AS "authorAvatarUrl",
      p.neynar_user_score AS "authorNeynarScore",
      NULL::bigint AS "aiOutputId",
      NULL::text AS "aiOutputModel",
      NULL::jsonb AS "aiOutputOutput",
      NULL::timestamptz AS "aiOutputCreatedAt",
      NULL::numeric AS "evalShare",
      NULL::bigint AS "evalRank",
      NULL::double precision AS "evalWinRate",
      c.reply_count AS "replyCount",
      c.view_count AS "viewCount",
      c.last_reply_at AS "lastReplyTimestamp",
      lr.fname AS "lastReplyAuthorFname"
    FROM farcaster.casts c
    LEFT JOIN farcaster.profiles p ON p.fid = c.fid
    LEFT JOIN farcaster.profiles lr ON lr.fid = c.last_reply_fid AND lr.hidden_at IS NULL
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object('fid', prof.fid, 'fname', prof.fname)
        ORDER BY mf.idx
      ) AS profiles
      FROM unnest(c.mentioned_fids) WITH ORDINALITY AS mf(fid, idx)
      JOIN farcaster.profiles prof ON prof.fid = mf.fid
    ) mp ON TRUE
    ${baseWhere}
    ORDER BY ${orderBy}
    LIMIT ${pageSize + 1}
    OFFSET ${safeOffset}
  `;

  const hasMore = safeOffset + pageSize < totalCount;
  const pageRows = (rows.length > pageSize ? rows.slice(0, pageSize) : rows).filter((row) =>
    hasText(row.text)
  );

  return {
    items: pageRows.map((row) => {
      const cast = mapCastRowToFarcasterCast(row);
      const attachment = getPrimaryAttachment(cast.embeds, row.embedSummaries);
      const { title, excerpt } = getTitleAndExcerpt(cast.text);
      const replyCount = toNumber(row.replyCount) ?? 0;

      return {
        hash: cast.hash,
        title,
        excerpt,
        text: cast.text,
        author: cast.author,
        createdAt: cast.timestamp,
        replyCount,
        viewCount: toNumber(row.viewCount) ?? 0,
        attachment,
        lastReply: row.lastReplyTimestamp
          ? {
              createdAt: row.lastReplyTimestamp.toISOString(),
              authorUsername: row.lastReplyAuthorFname ?? "unknown",
            }
          : null,
      };
    }),
    hasMore,
    totalCount,
    totalPages,
  };
}
