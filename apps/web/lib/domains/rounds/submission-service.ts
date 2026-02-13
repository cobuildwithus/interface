import "server-only";

import prisma from "@/lib/server/db/cobuild-db-client";
import { normalizeEntityId } from "@/lib/shared/entity-id";
import type { FarcasterCast } from "@/types/farcaster";
import type { RoundSubmission, RoundSubmissionSource } from "@/types/round-submission";
import { mapCastRowToFarcasterCast } from "./cast-mappers";
import type {
  CastRow,
  RoundSubmissionsResult,
  SubmissionQueryRow,
} from "./submission-service/types";
import {
  buildRoundSubmission,
  normalizeSubmissionId,
  parseRoundId,
  toAiOutput,
} from "./submission-service/utils";

const NORMALIZE_OPTIONS = { allowUnknown: true, unknownCase: "preserve" } as const;

export async function getSubmissionsByRoundWithAiOutputs(
  roundId: string,
  ruleId: number
): Promise<RoundSubmissionsResult> {
  const roundIdBigInt = parseRoundId(roundId);
  if (!roundIdBigInt) return { submissions: [], roundEntityIds: [] };

  const rows = await prisma.$replica().$queryRaw<SubmissionQueryRow[]>`
    SELECT
      rs.source::text AS "source",
      rs.post_id AS "postId",
      rs.url,
      rs.created_at AS "createdAt",
      rs.inserted_at AS "insertedAt",
      rs.ai_title AS "aiTitle",
      rs.ai_category AS "aiCategory",
      rs.author_handle AS "authorHandle",
      rs.author_display_name AS "authorDisplayName",
      rs.author_avatar_url AS "authorAvatarUrl",
      rs.raw_text AS "rawText",
      rs.display_text AS "displayText",
      rs.metadata,
      rs.media_urls AS "mediaUrls",
      pes.share AS "evalShare",
      pes.rank AS "evalRank",
      pes.win_rate AS "evalWinRate"
    FROM capital_allocation.round_submissions rs
    LEFT JOIN capital_allocation.post_eval_scores pes
      ON pes.round_submission_id = rs.id
      AND pes.round_id = ${roundIdBigInt}
    WHERE rs.round_id = ${roundIdBigInt}
    ORDER BY COALESCE(pes.share, 0) DESC, COALESCE(rs.created_at, rs.inserted_at) DESC
  `;

  const submissions = rows.map((row) =>
    buildRoundSubmission({
      ...row,
      source: row.source as RoundSubmissionSource,
    })
  );

  const roundEntityIds = submissions
    .map((submission) => submission.entityId)
    .filter((id): id is string => Boolean(id));

  return { submissions, roundEntityIds };
}

export async function getRoundSubmissionByPostId(params: {
  roundId: string;
  postId: string;
  ruleId: number;
}): Promise<RoundSubmission | null> {
  const roundIdBigInt = parseRoundId(params.roundId);
  if (!roundIdBigInt) return null;

  const normalizedCandidate = normalizeSubmissionId(params.postId);
  if (!normalizedCandidate) return null;

  const submission = await prisma.roundSubmission.findFirst({
    where: { roundId: roundIdBigInt, postId: normalizedCandidate },
    select: {
      source: true,
      postId: true,
      url: true,
      authorHandle: true,
      authorDisplayName: true,
      authorAvatarUrl: true,
      rawText: true,
      displayText: true,
      createdAt: true,
      insertedAt: true,
      aiTitle: true,
      aiCategory: true,
      metadata: true,
      mediaUrls: true,
    },
  });

  if (!submission) return null;

  const normalizedPostId = normalizeSubmissionId(submission.postId);
  if (!normalizedPostId) return null;

  const ai = await prisma.aiModelOutput.findFirst({
    where: { postId: normalizedPostId, ruleId: params.ruleId },
    orderBy: { createdAt: "desc" },
    select: { id: true, model: true, output: true, createdAt: true },
  });

  const aiOutput = toAiOutput(ai);

  return buildRoundSubmission({
    ...submission,
    aiOutput,
  });
}

export async function getCastByHash(
  castHash: string,
  ruleId: number,
  roundId: string
): Promise<FarcasterCast | null> {
  const roundIdBigInt = parseRoundId(roundId);
  if (!roundIdBigInt) return null;

  const normalized = normalizeEntityId(castHash);
  // This endpoint only supports Farcaster hashes (0x + 40 hex).
  if (!normalized || !/^0x[0-9a-f]{40}$/i.test(normalized)) return null;
  const hashBuffer = Buffer.from(normalized.slice(2), "hex");

  // Cross-schema lookup in the unified Cobuild DB.
  const rows = await prisma.$replica().$queryRaw<CastRow[]>`
    SELECT
      c.hash,
      c.text,
      c.timestamp AS "castTimestamp",
      c.embeds_array AS "embedsArray",
      c.mentioned_fids AS "mentionedFids",
      c.mentions_positions_array AS "mentionsPositions",
      mp.profiles AS "mentionProfiles",
      c.fid,
      p.fname AS "authorFname",
      p.display_name AS "authorDisplayName",
      p.avatar_url AS "authorAvatarUrl",
      p.neynar_user_score AS "authorNeynarScore",
      ao.id AS "aiOutputId",
      ao.model AS "aiOutputModel",
      ao.output AS "aiOutputOutput",
      ao.created_at AS "aiOutputCreatedAt",
      pes.share AS "evalShare",
      pes.rank AS "evalRank",
      pes.win_rate AS "evalWinRate"
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
    LEFT JOIN LATERAL (
      SELECT id, model, output, created_at
      FROM capital_allocation.ai_model_outputs
      WHERE rule_id = ${ruleId}
        AND post_id = concat('0x', encode(c.hash, 'hex'))
      ORDER BY created_at DESC
      LIMIT 1
    ) ao ON TRUE
    LEFT JOIN capital_allocation.round_submissions rs
      ON rs.round_id = ${roundIdBigInt}
      AND rs.source = 'farcaster'::capital_allocation.round_submission_source
      AND rs.post_id = concat('0x', encode(c.hash, 'hex'))
    LEFT JOIN capital_allocation.post_eval_scores pes
      ON pes.round_id = ${roundIdBigInt}
      AND pes.round_submission_id = rs.id
    WHERE c.hash = ${hashBuffer}
      AND c.deleted_at IS NULL
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  return mapCastRowToFarcasterCast(rows[0]);
}

export async function getRoundEntityIds(roundId: string): Promise<string[]> {
  const roundIdBigInt = parseRoundId(roundId);
  if (!roundIdBigInt) return [];

  const rows = await prisma.roundSubmission.findMany({
    where: { roundId: roundIdBigInt },
    select: { postId: true },
  });

  return rows
    .map((row) => normalizeEntityId(row.postId, NORMALIZE_OPTIONS))
    .filter((id): id is string => Boolean(id));
}

// Note: round submission writes are owned by the farcaster-crons service.
