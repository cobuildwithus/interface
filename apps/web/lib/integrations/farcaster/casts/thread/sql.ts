import { Prisma } from "@/generated/prisma/client";
import {
  COBUILD_CHANNEL_URL,
  NEYNAR_SCORE_THRESHOLD,
} from "@/lib/integrations/farcaster/casts/shared";

export const MERGE_WINDOW_MS = 8000;
export const MERGE_INTERVAL_SQL = Prisma.sql`${MERGE_WINDOW_MS} * interval '1 millisecond'`;

function columnRef(alias: string, column: string): Prisma.Sql {
  return Prisma.raw(`${alias}.${column}`);
}

export function buildHasAttachmentSql(alias: string): Prisma.Sql {
  const embedSummaries = columnRef(alias, "embed_summaries");
  const embedsArray = columnRef(alias, "embeds_array");

  return Prisma.sql`(
    COALESCE(array_length(${embedSummaries}, 1), 0) > 0
    OR (${embedsArray} IS NOT NULL AND jsonb_path_exists(${embedsArray}, '$[*] ? (@.url != null)'))
  )`;
}

export function buildRenderableCastSql(alias: string): Prisma.Sql {
  const text = columnRef(alias, "text");
  const mentionedFids = columnRef(alias, "mentioned_fids");

  return Prisma.sql`(
    (${text} IS NOT NULL AND btrim(${text}) <> '')
    OR COALESCE(array_length(${mentionedFids}, 1), 0) > 0
    OR ${buildHasAttachmentSql(alias)}
  )`;
}

export const HAS_ATTACHMENT_SQL = buildHasAttachmentSql("c");

export const REPLIES_WHERE_SQL = Prisma.sql`
  WHERE c.deleted_at IS NULL
    AND c.hidden_at IS NULL
    AND c.root_parent_url = ${COBUILD_CHANNEL_URL}
    AND ${buildRenderableCastSql("c")}
    AND c.fid IS NOT NULL
    AND p.hidden_at IS NULL
    AND p.neynar_user_score IS NOT NULL
    AND p.neynar_user_score >= ${NEYNAR_SCORE_THRESHOLD}
    AND c.hash <> root.root_hash
`;

export const MERGE_ROOT_CONDITION_SQL = Prisma.sql`
  o.fid = o.root_fid
  AND o.parent_hash = o.root_hash
  AND o.cast_timestamp IS NOT NULL
  AND o.root_timestamp IS NOT NULL
  AND o.cast_timestamp >= o.root_timestamp
  AND o.cast_timestamp - o.root_timestamp <= ${MERGE_INTERVAL_SQL}
  AND NOT o.has_attachment
`;

export const MERGE_CHAIN_CONDITION_SQL = Prisma.sql`
  o.fid = o.root_fid
  AND m.fid = o.root_fid
  AND o.parent_hash = m.hash
  AND o.cast_timestamp IS NOT NULL
  AND m.cast_timestamp IS NOT NULL
  AND o.cast_timestamp >= m.cast_timestamp
  AND o.cast_timestamp - m.cast_timestamp <= ${MERGE_INTERVAL_SQL}
  AND NOT o.has_attachment
`;

export const MERGE_TARGET_SQL = Prisma.sql`
  CASE
    WHEN ${MERGE_ROOT_CONDITION_SQL} THEN o.root_hash
    WHEN ${MERGE_CHAIN_CONDITION_SQL} THEN m.merge_target
    ELSE o.hash
  END
`;

export const MERGE_ROOT_ONLY_TARGET_SQL = Prisma.sql`
  CASE
    WHEN ${MERGE_ROOT_CONDITION_SQL} THEN o.root_hash
    ELSE o.hash
  END
`;

export const MERGE_FLAG_SQL = Prisma.sql`
  CASE
    WHEN ${MERGE_ROOT_CONDITION_SQL} THEN TRUE
    WHEN ${MERGE_CHAIN_CONDITION_SQL} THEN TRUE
    ELSE FALSE
  END
`;

export const MERGE_ROOT_ONLY_FLAG_SQL = Prisma.sql`
  CASE
    WHEN ${MERGE_ROOT_CONDITION_SQL} THEN TRUE
    ELSE FALSE
  END
`;
