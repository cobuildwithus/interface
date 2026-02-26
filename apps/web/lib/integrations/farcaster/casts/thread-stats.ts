import "server-only";

import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/server/db/cobuild-db-client";
import { NEYNAR_SCORE_THRESHOLD } from "./shared";

const MERGE_WINDOW_MS = 8_000;

function normalizeRootHashes(roots: ReadonlyArray<Buffer | null | undefined>): Buffer[] {
  const byHex = new Map<string, Buffer>();
  for (const root of roots) {
    if (!root || root.length === 0) continue;
    byHex.set(root.toString("hex"), root);
  }
  return Array.from(byHex.values());
}

export async function updateThreadStatsForRoots(
  rootHashes: ReadonlyArray<Buffer | null | undefined>
): Promise<void> {
  const uniqueRoots = normalizeRootHashes(rootHashes);
  if (uniqueRoots.length === 0) return;

  const rootsSql = Prisma.join(uniqueRoots.map((hash) => Prisma.sql`${hash}`));
  const mergeIntervalSql = Prisma.sql`${MERGE_WINDOW_MS} * interval '1 millisecond'`;

  await prisma.$executeRaw`
    WITH target_roots AS (
      SELECT DISTINCT unnest(ARRAY[${rootsSql}]::bytea[]) AS root_hash
    ),
    roots AS (
      SELECT
        c.hash AS root_hash,
        c.fid AS root_fid,
        c.timestamp AS root_timestamp
      FROM farcaster.casts c
      JOIN target_roots tr ON tr.root_hash = c.hash
    ),
    replies AS (
      SELECT
        r.hash,
        r.root_parent_hash AS root_hash,
        r.parent_hash,
        r.fid,
        r.timestamp,
        r.embeds_array,
        r.embed_summaries,
        roots.root_fid,
        roots.root_timestamp
      FROM farcaster.casts r
      JOIN farcaster.profiles rp ON rp.fid = r.fid
      JOIN roots ON roots.root_hash = r.root_parent_hash
      WHERE r.deleted_at IS NULL
        AND r.hidden_at IS NULL
        AND r.text IS NOT NULL
        AND btrim(r.text) <> ''
        AND rp.hidden_at IS NULL
        AND rp.neynar_user_score IS NOT NULL
        AND rp.neynar_user_score >= ${NEYNAR_SCORE_THRESHOLD}
    ),
    ordered_replies AS (
      SELECT
        r.*,
        LAG(r.hash) OVER (
          PARTITION BY r.root_hash
          ORDER BY r.timestamp ASC NULLS LAST, r.hash ASC
        ) AS prev_hash,
        LAG(r.fid) OVER (
          PARTITION BY r.root_hash
          ORDER BY r.timestamp ASC NULLS LAST, r.hash ASC
        ) AS prev_fid,
        LAG(r.timestamp) OVER (
          PARTITION BY r.root_hash
          ORDER BY r.timestamp ASC NULLS LAST, r.hash ASC
        ) AS prev_timestamp,
        (
          COALESCE(array_length(r.embed_summaries, 1), 0) > 0
          OR (r.embeds_array IS NOT NULL AND jsonb_path_exists(r.embeds_array, '$[*] ? (@.url != null)'))
        ) AS has_attachment
      FROM replies r
    ),
    anchored_replies AS (
      SELECT
        root_hash,
        hash,
        fid,
        timestamp,
        parent_hash,
        root_fid,
        root_timestamp,
        prev_fid,
        prev_hash,
        prev_timestamp,
        has_attachment,
        CASE
          WHEN fid = root_fid AND prev_fid = root_fid THEN prev_hash
          ELSE root_hash
        END AS merge_anchor_hash,
        CASE
          WHEN fid = root_fid AND prev_fid = root_fid THEN prev_timestamp
          ELSE root_timestamp
        END AS merge_anchor_timestamp
      FROM ordered_replies
    ),
    visible_replies AS (
      SELECT
        root_hash,
        hash,
        fid,
        timestamp,
        CASE
          WHEN fid IS NULL OR root_fid IS NULL THEN FALSE
          WHEN fid <> root_fid THEN FALSE
          WHEN has_attachment THEN FALSE
          WHEN timestamp IS NULL THEN FALSE
          WHEN merge_anchor_timestamp IS NULL THEN FALSE
          WHEN parent_hash <> merge_anchor_hash THEN FALSE
          WHEN timestamp < merge_anchor_timestamp THEN FALSE
          ELSE timestamp - merge_anchor_timestamp <= ${mergeIntervalSql}
        END AS is_merged
      FROM anchored_replies
    ),
    stats AS (
      SELECT
        root_hash,
        COUNT(*) FILTER (WHERE NOT is_merged) AS reply_count,
        MAX(timestamp) FILTER (WHERE NOT is_merged) AS last_reply_at,
        (ARRAY_AGG(hash ORDER BY timestamp DESC NULLS LAST) FILTER (WHERE NOT is_merged))[1] AS last_reply_hash,
        (ARRAY_AGG(fid ORDER BY timestamp DESC NULLS LAST) FILTER (WHERE NOT is_merged))[1] AS last_reply_fid
      FROM visible_replies
      GROUP BY root_hash
    )
    UPDATE farcaster.casts c
    SET
      reply_count = COALESCE(stats.reply_count, 0),
      last_reply_at = stats.last_reply_at,
      last_reply_hash = stats.last_reply_hash,
      last_reply_fid = stats.last_reply_fid,
      last_activity_at = CASE
        WHEN stats.last_reply_at IS NULL THEN c.timestamp
        WHEN c.timestamp IS NULL THEN stats.last_reply_at
        ELSE GREATEST(c.timestamp, stats.last_reply_at)
      END
    FROM target_roots tr
    LEFT JOIN stats ON stats.root_hash = tr.root_hash
    WHERE c.hash = tr.root_hash
  `;
}
