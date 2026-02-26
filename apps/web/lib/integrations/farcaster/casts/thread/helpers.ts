import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/server/db/cobuild-db-client";
import { mapCastRowToFarcasterCast } from "@/lib/domains/rounds/cast-mappers";
import { getPrimaryAttachment } from "@/lib/integrations/farcaster/casts/attachments";
import type { MentionProfileInput } from "@/lib/integrations/farcaster/mentions";
import {
  COBUILD_CHANNEL_URL,
  NEYNAR_SCORE_THRESHOLD,
  bufferToHash,
  hasText,
  toFidNumber,
  toNumber,
} from "@/lib/integrations/farcaster/casts/shared";
import {
  HAS_ATTACHMENT_SQL,
  MERGE_FLAG_SQL,
  MERGE_ROOT_ONLY_FLAG_SQL,
  MERGE_ROOT_ONLY_TARGET_SQL,
  MERGE_TARGET_SQL,
  MERGE_WINDOW_MS,
  REPLIES_WHERE_SQL,
} from "@/lib/integrations/farcaster/casts/thread/sql";
import type { ThreadCast } from "@/lib/integrations/farcaster/casts/types";

type ThreadCastRow = {
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
  parentHash: Buffer | null;
  viewCount: bigint | number | null;
  hiddenAt: Date | null;
  hiddenReason: string | null;
};

export type ThreadReplyRow = ThreadCastRow & {
  mergeTarget: Buffer;
  isMerged: boolean;
};

type ActivityStats = {
  activity: number;
  posts: number;
};

type MergeRepliesResult = {
  replies: ThreadCast[];
  mergedTo: Map<string, string>;
};

export async function loadCobuildThreadRows(hashBuffer: Buffer): Promise<ThreadCastRow[]> {
  return prisma.$replica().$queryRaw<ThreadCastRow[]>`
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
      c.parent_hash AS "parentHash",
      NULL::bigint AS "aiOutputId",
      NULL::text AS "aiOutputModel",
      NULL::jsonb AS "aiOutputOutput",
      NULL::timestamptz AS "aiOutputCreatedAt",
      NULL::numeric AS "evalShare",
      NULL::bigint AS "evalRank",
      NULL::double precision AS "evalWinRate",
      c.view_count AS "viewCount",
      c.hidden_at AS "hiddenAt",
      c.hidden_reason AS "hiddenReason"
    FROM farcaster.casts c
    LEFT JOIN farcaster.profiles p ON p.fid = c.fid
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object('fid', prof.fid, 'fname', prof.fname)
        ORDER BY mf.idx
      ) AS profiles
      FROM unnest(c.mentioned_fids) WITH ORDINALITY AS mf(fid, idx)
      JOIN farcaster.profiles prof ON prof.fid = mf.fid
    ) mp ON TRUE
    WHERE c.deleted_at IS NULL
      AND c.root_parent_url = ${COBUILD_CHANNEL_URL}
      AND (c.hash = ${hashBuffer} OR c.root_parent_hash = ${hashBuffer})
      AND c.text IS NOT NULL
      AND btrim(c.text) <> ''
      AND c.fid IS NOT NULL
      AND (c.hidden_at IS NULL OR (c.hash = ${hashBuffer} AND c.parent_hash IS NULL))
      AND (p.hidden_at IS NULL OR (c.hash = ${hashBuffer} AND c.parent_hash IS NULL))
    ORDER BY c.timestamp ASC NULLS LAST
  `;
}

export async function loadCobuildRootCastRow(hashBuffer: Buffer): Promise<ThreadCastRow | null> {
  const rows = await prisma.$replica().$queryRaw<ThreadCastRow[]>`
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
      c.parent_hash AS "parentHash",
      NULL::bigint AS "aiOutputId",
      NULL::text AS "aiOutputModel",
      NULL::jsonb AS "aiOutputOutput",
      NULL::timestamptz AS "aiOutputCreatedAt",
      NULL::numeric AS "evalShare",
      NULL::bigint AS "evalRank",
      NULL::double precision AS "evalWinRate",
      c.view_count AS "viewCount",
      c.hidden_at AS "hiddenAt",
      c.hidden_reason AS "hiddenReason"
    FROM farcaster.casts c
    LEFT JOIN farcaster.profiles p ON p.fid = c.fid
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object('fid', prof.fid, 'fname', prof.fname)
        ORDER BY mf.idx
      ) AS profiles
      FROM unnest(c.mentioned_fids) WITH ORDINALITY AS mf(fid, idx)
      JOIN farcaster.profiles prof ON prof.fid = mf.fid
    ) mp ON TRUE
    WHERE c.hash = ${hashBuffer}
      AND c.deleted_at IS NULL
      AND c.root_parent_url = ${COBUILD_CHANNEL_URL}
      AND c.text IS NOT NULL
      AND btrim(c.text) <> ''
      AND c.fid IS NOT NULL
      AND (c.hidden_at IS NULL OR (c.hash = ${hashBuffer} AND c.parent_hash IS NULL))
      AND (p.hidden_at IS NULL OR (c.hash = ${hashBuffer} AND c.parent_hash IS NULL))
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function loadCobuildThreadRepliesPage(
  hashBuffer: Buffer,
  params: { limit: number; offset: number }
): Promise<{ rows: ThreadReplyRow[]; replyCount: number }> {
  const countRows = await prisma.$replica().$queryRaw<{ count: bigint | number | null }[]>`
    WITH RECURSIVE root AS (
      SELECT
        c.hash AS root_hash,
        c.fid AS root_fid,
        c.timestamp AS root_timestamp
      FROM farcaster.casts c
      WHERE c.hash = ${hashBuffer}
        AND c.deleted_at IS NULL
        AND c.root_parent_url = ${COBUILD_CHANNEL_URL}
    ),
    replies AS (
      SELECT
        c.hash,
        c.fid,
        c.parent_hash AS parent_hash,
        c.timestamp AS cast_timestamp,
        c.embeds_array AS embeds_array,
        c.embed_summaries AS embed_summaries,
        root.root_hash,
        root.root_fid,
        root.root_timestamp,
        ${HAS_ATTACHMENT_SQL} AS has_attachment
      FROM farcaster.casts c
      JOIN root ON root.root_hash = c.root_parent_hash
      JOIN farcaster.profiles p ON p.fid = c.fid
      ${REPLIES_WHERE_SQL}
    ),
    ordered_replies AS (
      SELECT
        r.*,
        row_number() OVER (ORDER BY r.cast_timestamp ASC NULLS LAST, r.hash ASC) AS rn
      FROM replies r
    ),
    merged AS (
      SELECT
        o.*,
        ${MERGE_ROOT_ONLY_TARGET_SQL} AS merge_target,
        ${MERGE_ROOT_ONLY_FLAG_SQL} AS is_merged
      FROM ordered_replies o
      WHERE o.rn = 1
      UNION ALL
      SELECT
        o.*,
        ${MERGE_TARGET_SQL} AS merge_target,
        ${MERGE_FLAG_SQL} AS is_merged
      FROM merged m
      JOIN ordered_replies o ON o.rn = m.rn + 1
    )
    SELECT COUNT(*)::bigint AS count
    FROM merged
    WHERE is_merged = FALSE
  `;

  const replyCount = toNumber(countRows[0]?.count) ?? 0;
  const requestedLimit = Math.max(0, params.limit);
  const safeLimit = Math.min(requestedLimit, replyCount);
  const safeOffset = Math.max(0, params.offset);

  if (replyCount === 0 || safeLimit === 0) {
    return { rows: [], replyCount };
  }

  const rows = await prisma.$replica().$queryRaw<ThreadReplyRow[]>`
    WITH RECURSIVE root AS (
      SELECT
        c.hash AS root_hash,
        c.fid AS root_fid,
        c.timestamp AS root_timestamp
      FROM farcaster.casts c
      WHERE c.hash = ${hashBuffer}
        AND c.deleted_at IS NULL
        AND c.root_parent_url = ${COBUILD_CHANNEL_URL}
    ),
    replies AS (
      SELECT
        c.hash,
        c.text,
        c.timestamp AS cast_timestamp,
        c.embeds_array AS embeds_array,
        c.embed_summaries AS embed_summaries,
        c.mentions_positions_array AS mentions_positions,
        mp.profiles AS mention_profiles,
        c.fid,
        p.fname AS author_fname,
        p.display_name AS author_display_name,
        p.avatar_url AS author_avatar_url,
        p.neynar_user_score AS author_neynar_score,
        c.parent_hash AS parent_hash,
        NULL::bigint AS ai_output_id,
        NULL::text AS ai_output_model,
        NULL::jsonb AS ai_output_output,
        NULL::timestamptz AS ai_output_created_at,
        NULL::numeric AS eval_share,
        NULL::bigint AS eval_rank,
        NULL::double precision AS eval_win_rate,
        c.view_count AS view_count,
        c.hidden_at AS hidden_at,
        c.hidden_reason AS hidden_reason,
        root.root_hash,
        root.root_fid,
        root.root_timestamp,
        ${HAS_ATTACHMENT_SQL} AS has_attachment
      FROM farcaster.casts c
      JOIN root ON root.root_hash = c.root_parent_hash
      JOIN farcaster.profiles p ON p.fid = c.fid
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object('fid', prof.fid, 'fname', prof.fname)
          ORDER BY mf.idx
        ) AS profiles
        FROM unnest(c.mentioned_fids) WITH ORDINALITY AS mf(fid, idx)
        JOIN farcaster.profiles prof ON prof.fid = mf.fid
      ) mp ON TRUE
      ${REPLIES_WHERE_SQL}
    ),
    ordered_replies AS (
      SELECT
        r.*,
        row_number() OVER (ORDER BY r.cast_timestamp ASC NULLS LAST, r.hash ASC) AS rn
      FROM replies r
    ),
    merged AS (
      SELECT
        o.*,
        ${MERGE_ROOT_ONLY_TARGET_SQL} AS merge_target,
        ${MERGE_ROOT_ONLY_FLAG_SQL} AS is_merged
      FROM ordered_replies o
      WHERE o.rn = 1
      UNION ALL
      SELECT
        o.*,
        ${MERGE_TARGET_SQL} AS merge_target,
        ${MERGE_FLAG_SQL} AS is_merged
      FROM merged m
      JOIN ordered_replies o ON o.rn = m.rn + 1
    ),
    visible AS (
      SELECT *
      FROM merged
      WHERE is_merged = FALSE
    ),
    page AS (
      SELECT *
      FROM visible
      ORDER BY cast_timestamp ASC NULLS LAST, hash ASC
      LIMIT ${safeLimit}
      OFFSET ${safeOffset}
    ),
    needed AS (
      SELECT *
      FROM merged
      WHERE hash IN (SELECT hash FROM page)
        OR merge_target IN (SELECT hash FROM page)
        OR (merge_target = (SELECT root_hash FROM root) AND is_merged = TRUE)
    )
    SELECT
      hash,
      text,
      cast_timestamp AS "castTimestamp",
      embeds_array AS "embedsArray",
      embed_summaries AS "embedSummaries",
      mentions_positions AS "mentionsPositions",
      mention_profiles AS "mentionProfiles",
      fid,
      author_fname AS "authorFname",
      author_display_name AS "authorDisplayName",
      author_avatar_url AS "authorAvatarUrl",
      author_neynar_score AS "authorNeynarScore",
      parent_hash AS "parentHash",
      ai_output_id AS "aiOutputId",
      ai_output_model AS "aiOutputModel",
      ai_output_output AS "aiOutputOutput",
      ai_output_created_at AS "aiOutputCreatedAt",
      eval_share AS "evalShare",
      eval_rank AS "evalRank",
      eval_win_rate AS "evalWinRate",
      view_count AS "viewCount",
      hidden_at AS "hiddenAt",
      hidden_reason AS "hiddenReason",
      merge_target AS "mergeTarget",
      is_merged AS "isMerged"
    FROM needed
    ORDER BY cast_timestamp ASC NULLS LAST, hash ASC
  `;

  return { rows, replyCount };
}

export async function loadCobuildThreadFocusIndex(
  hashBuffer: Buffer,
  focusHash: Buffer
): Promise<{ mergeTarget: Buffer | null; index: number | null }> {
  const rows = await prisma.$replica().$queryRaw<
    {
      mergeTarget: Buffer | null;
      rowNumber: bigint | number | null;
    }[]
  >`
    WITH RECURSIVE root AS (
      SELECT
        c.hash AS root_hash,
        c.fid AS root_fid,
        c.timestamp AS root_timestamp
      FROM farcaster.casts c
      WHERE c.hash = ${hashBuffer}
        AND c.deleted_at IS NULL
        AND c.root_parent_url = ${COBUILD_CHANNEL_URL}
    ),
    replies AS (
      SELECT
        c.hash,
        c.fid,
        c.parent_hash AS parent_hash,
        c.timestamp AS cast_timestamp,
        c.embeds_array AS embeds_array,
        c.embed_summaries AS embed_summaries,
        root.root_hash,
        root.root_fid,
        root.root_timestamp,
        ${HAS_ATTACHMENT_SQL} AS has_attachment
      FROM farcaster.casts c
      JOIN root ON root.root_hash = c.root_parent_hash
      JOIN farcaster.profiles p ON p.fid = c.fid
      ${REPLIES_WHERE_SQL}
    ),
    ordered_replies AS (
      SELECT
        r.*,
        row_number() OVER (ORDER BY r.cast_timestamp ASC NULLS LAST, r.hash ASC) AS rn
      FROM replies r
    ),
    merged AS (
      SELECT
        o.*,
        ${MERGE_ROOT_ONLY_TARGET_SQL} AS merge_target,
        ${MERGE_ROOT_ONLY_FLAG_SQL} AS is_merged
      FROM ordered_replies o
      WHERE o.rn = 1
      UNION ALL
      SELECT
        o.*,
        ${MERGE_TARGET_SQL} AS merge_target,
        ${MERGE_FLAG_SQL} AS is_merged
      FROM merged m
      JOIN ordered_replies o ON o.rn = m.rn + 1
    ),
    focus AS (
      SELECT merge_target AS "mergeTarget"
      FROM merged
      WHERE hash = ${focusHash}
      LIMIT 1
    ),
    visible AS (
      SELECT
        hash,
        row_number() OVER (ORDER BY cast_timestamp ASC NULLS LAST, hash ASC) AS rn
      FROM merged
      WHERE is_merged = FALSE
    )
    SELECT
      focus."mergeTarget" AS "mergeTarget",
      visible.rn AS "rowNumber"
    FROM focus
    LEFT JOIN visible ON visible.hash = focus."mergeTarget"
    LIMIT 1
  `;

  const row = rows[0];
  if (!row?.mergeTarget) return { mergeTarget: null, index: null };
  const index = row.rowNumber ? toNumber(row.rowNumber) : null;
  return {
    mergeTarget: row.mergeTarget,
    index: index && index > 0 ? index - 1 : null,
  };
}

export async function loadCobuildCastsByHashes(hashes: Buffer[]): Promise<ThreadCastRow[]> {
  if (hashes.length === 0) return [];

  const unique = Array.from(new Map(hashes.map((hash) => [hash.toString("hex"), hash])).values());
  const hashSql = Prisma.join(unique.map((hash) => Prisma.sql`${hash}`));

  return prisma.$replica().$queryRaw<ThreadCastRow[]>`
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
      c.parent_hash AS "parentHash",
      NULL::bigint AS "aiOutputId",
      NULL::text AS "aiOutputModel",
      NULL::jsonb AS "aiOutputOutput",
      NULL::timestamptz AS "aiOutputCreatedAt",
      NULL::numeric AS "evalShare",
      NULL::bigint AS "evalRank",
      NULL::double precision AS "evalWinRate",
      c.view_count AS "viewCount",
      c.hidden_at AS "hiddenAt",
      c.hidden_reason AS "hiddenReason"
    FROM farcaster.casts c
    LEFT JOIN farcaster.profiles p ON p.fid = c.fid
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object('fid', prof.fid, 'fname', prof.fname)
        ORDER BY mf.idx
      ) AS profiles
      FROM unnest(c.mentioned_fids) WITH ORDINALITY AS mf(fid, idx)
      JOIN farcaster.profiles prof ON prof.fid = mf.fid
    ) mp ON TRUE
    WHERE c.hash IN (${hashSql})
      AND c.deleted_at IS NULL
      AND c.root_parent_url = ${COBUILD_CHANNEL_URL}
      AND c.text IS NOT NULL
      AND btrim(c.text) <> ''
      AND c.fid IS NOT NULL
      AND c.hidden_at IS NULL
      AND p.hidden_at IS NULL
  `;
}

export function mapThreadRows(
  rows: ThreadCastRow[],
  activityMap: Map<number, ActivityStats> = new Map()
): ThreadCast[] {
  return rows.map((row) => {
    const cast = mapCastRowToFarcasterCast(row);
    const attachment = getPrimaryAttachment(cast.embeds, row.embedSummaries);
    const fid = toFidNumber(row.fid);
    const stats = fid > 0 ? activityMap.get(fid) : null;
    const activity = stats?.activity ?? 0;
    const activityPosts = stats?.posts ?? 0;
    return {
      hash: cast.hash,
      parentHash: bufferToHash(row.parentHash),
      text: cast.text,
      author: {
        ...cast.author,
        activity,
        activity_posts: activityPosts,
      },
      createdAt: cast.timestamp,
      attachment,
      viewCount: toNumber(row.viewCount) ?? 0,
      hiddenAt: row.hiddenAt?.toISOString() ?? null,
      hiddenReason: row.hiddenReason ?? null,
    } satisfies ThreadCast;
  });
}

export function getThreadSlices(mapped: ThreadCast[], rootHash: string) {
  const root = mapped.find((cast) => cast.hash === rootHash) ?? null;
  if (!root) return null;

  const castsWithText = mapped.filter((cast) => hasText(cast.text));
  const visibleReplies = castsWithText
    .filter((cast) => cast.hash !== rootHash)
    .filter((cast) => (cast.author.neynar_score ?? 0) >= NEYNAR_SCORE_THRESHOLD);

  return { root, castsWithText, visibleReplies };
}

export function mergeRootAuthorReplies(
  replies: ThreadCast[],
  root: ThreadCast
): MergeRepliesResult {
  if (replies.length === 0) return { replies, mergedTo: new Map() };

  const merged: ThreadCast[] = [];
  const mergedTo = new Map<string, string>();
  const rootFid = root.author.fid;
  let chainHead: ThreadCast | null = null;
  let chainTail: ThreadCast | null = null;

  const setChain = (next: ThreadCast | null) => {
    chainHead = next;
    chainTail = next;
  };

  const isWithinMergeWindow = (anchor: ThreadCast, reply: ThreadCast) => {
    const anchorTime = new Date(anchor.createdAt).getTime();
    const replyTime = new Date(reply.createdAt).getTime();
    return (
      Number.isFinite(anchorTime) &&
      Number.isFinite(replyTime) &&
      replyTime >= anchorTime &&
      replyTime - anchorTime <= MERGE_WINDOW_MS
    );
  };

  for (const reply of replies) {
    const isRootAuthor = reply.author.fid === rootFid;
    const parentHash = chainTail?.hash ?? root.hash;
    const timeAnchor = chainTail ?? root;
    const canMerge =
      isRootAuthor &&
      reply.parentHash === parentHash &&
      !reply.attachment &&
      isWithinMergeWindow(timeAnchor, reply);

    if (canMerge) {
      const target: ThreadCast = chainHead ?? root;
      target.text = [target.text, reply.text].filter(Boolean).join("\n\n");
      mergedTo.set(reply.hash, target.hash);
      chainTail = reply;
      chainHead = target;
      continue;
    }

    merged.push(reply);
    setChain(isRootAuthor ? reply : null);
  }

  return { replies: merged, mergedTo };
}
