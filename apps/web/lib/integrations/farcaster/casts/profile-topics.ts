import "server-only";

import prisma from "@/lib/server/db/cobuild-db-client";
import { unstable_cache } from "next/cache";
import { CACHE_TTL } from "@/lib/config/cache";
import {
  insertMentionsFromProfiles,
  type MentionProfileInput,
} from "@/lib/integrations/farcaster/mentions";
import { COBUILD_CHANNEL_URL, hasText, toNumber, bufferToHash } from "./shared";

type TopicRow = {
  hash: Buffer;
  text: string | null;
  castTimestamp: Date | null;
  viewCount: bigint | number | null;
  mentionsPositions: number[] | null;
  mentionProfiles: Array<MentionProfileInput | null> | null;
  repliers: Array<{ fid: number; username: string; avatar_url: string | null }> | null;
  replierCount: bigint | number | null;
};

type ReplyRow = {
  hash: Buffer;
  text: string | null;
  castTimestamp: Date | null;
  rootParentHash: Buffer | null;
  rootText: string | null;
  parentText: string | null;
  parentTimestamp: Date | null;
  parentUsername: string | null;
  mentionsPositions: number[] | null;
  mentionProfiles: Array<MentionProfileInput | null> | null;
};

export type TopicReplier = {
  fid: number;
  username: string;
  avatarUrl: string | null;
};

export type ProfileTopic = {
  hash: string;
  title: string;
  createdAt: string;
  viewCount: number;
  repliers: TopicReplier[];
  replierCount: number;
};

export type ProfileReply = {
  hash: string;
  title: string;
  createdAt: string;
  rootHash: string | null;
  topicTitle: string | null;
  parentQuote: {
    text: string;
    username: string;
    createdAt: string;
  } | null;
};

export type ProfileReplyGroup = {
  rootHash: string;
  topicTitle: string;
  replies: Array<{
    hash: string;
    text: string;
    createdAt: string;
    parentQuote: {
      text: string;
      username: string;
    } | null;
  }>;
};

export type ProfileStats = {
  topicsCreated: number;
  postsCreated: number;
  totalViews: number;
};

export type ProfileActivity = {
  topics: ProfileTopic[];
  replies: ProfileReply[];
};

type StatsRow = {
  topicsCreated: bigint | number;
  postsCreated: bigint | number;
  totalViews: bigint | number;
};

const getProfileStatsByFidCached = unstable_cache(
  async (fid: number): Promise<ProfileStats> => {
    const rows = await prisma.$replica().$queryRaw<StatsRow[]>`
      SELECT
        COUNT(*) FILTER (WHERE c.parent_hash IS NULL) AS "topicsCreated",
        COUNT(*) FILTER (WHERE c.parent_hash IS NOT NULL) AS "postsCreated",
        COALESCE(SUM(COALESCE(c.view_count, 0)), 0)::bigint AS "totalViews"
      FROM farcaster.casts c
      WHERE c.deleted_at IS NULL
        AND c.hidden_at IS NULL
        AND c.root_parent_url = ${COBUILD_CHANNEL_URL}
        AND c.text IS NOT NULL
        AND btrim(c.text) <> ''
        AND c.fid = ${BigInt(fid)}
    `;

    const row = rows[0];
    return {
      topicsCreated: toNumber(row?.topicsCreated) ?? 0,
      postsCreated: toNumber(row?.postsCreated) ?? 0,
      totalViews: toNumber(row?.totalViews) ?? 0,
    };
  },
  ["profile-stats-v1"],
  { revalidate: CACHE_TTL.PROFILE, tags: ["profile-stats-v1"] }
);

export async function getProfileStatsByFid(fid: number): Promise<ProfileStats> {
  if (!fid || fid <= 0) return { topicsCreated: 0, postsCreated: 0, totalViews: 0 };
  return getProfileStatsByFidCached(fid);
}

export async function getTopTopicsByFid(fid: number, limit: number = 5): Promise<ProfileTopic[]> {
  if (!fid || fid <= 0) return [];

  const rows = await prisma.$replica().$queryRaw<TopicRow[]>`
    SELECT
      c.hash,
      c.text,
      c.timestamp AS "castTimestamp",
      c.view_count AS "viewCount",
      c.mentions_positions_array AS "mentionsPositions",
      mp.profiles AS "mentionProfiles",
      rp.repliers AS "repliers",
      rc.cnt AS "replierCount"
    FROM farcaster.casts c
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object('fid', prof.fid, 'fname', prof.fname)
        ORDER BY mf.idx
      ) AS profiles
      FROM unnest(c.mentioned_fids) WITH ORDINALITY AS mf(fid, idx)
      JOIN farcaster.profiles prof ON prof.fid = mf.fid
    ) mp ON TRUE
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'fid', sub.fid,
        'username', sub.username,
        'avatar_url', sub.avatar_url
      )) AS repliers
      FROM (
        SELECT DISTINCT ON (reply.fid)
          reply.fid,
          COALESCE(prof.fname, prof.display_name, 'fid:' || reply.fid) AS username,
          prof.avatar_url
        FROM farcaster.casts reply
        JOIN farcaster.profiles prof ON prof.fid = reply.fid
        WHERE reply.root_parent_hash = c.hash
          AND reply.deleted_at IS NULL
          AND reply.fid != c.fid
        ORDER BY reply.fid, reply.timestamp DESC
        LIMIT 5
      ) sub
    ) rp ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(DISTINCT reply.fid) AS cnt
      FROM farcaster.casts reply
      WHERE reply.root_parent_hash = c.hash
        AND reply.deleted_at IS NULL
        AND reply.fid != c.fid
    ) rc ON TRUE
    WHERE c.deleted_at IS NULL
      AND c.hidden_at IS NULL
      AND c.parent_hash IS NULL
      AND c.root_parent_url = ${COBUILD_CHANNEL_URL}
      AND c.text IS NOT NULL
      AND btrim(c.text) <> ''
      AND c.fid = ${fid}
    ORDER BY c.view_count DESC NULLS LAST, c.timestamp DESC NULLS LAST
    LIMIT ${limit}
  `;

  return rows
    .filter((row): row is TopicRow & { text: string } => hasText(row.text))
    .map((row) => {
      const hash = bufferToHash(row.hash);
      const text = insertMentionsFromProfiles(
        row.text,
        row.mentionsPositions,
        row.mentionProfiles
      ).trim();
      const firstLine = text.split("\n")[0] ?? "";
      const title = firstLine.trim();

      const repliers: TopicReplier[] = (row.repliers ?? []).map((r) => ({
        fid: r.fid,
        username: r.username,
        avatarUrl: r.avatar_url,
      }));

      return {
        hash: hash ?? "",
        title: title || "Untitled",
        createdAt: row.castTimestamp?.toISOString() ?? new Date().toISOString(),
        viewCount: toNumber(row.viewCount) ?? 0,
        repliers,
        replierCount: toNumber(row.replierCount) ?? 0,
      };
    })
    .filter((topic) => topic.hash);
}

// Matches strings that are only emojis (including multi-codepoint emojis)
const EMOJI_ONLY_REGEX = /^[\p{Emoji}\p{Emoji_Component}\s]+$/u;

function isSubstantialText(text: string | null | undefined): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < 3) return false;
  if (EMOJI_ONLY_REGEX.test(trimmed)) return false;
  return true;
}

export async function getRecentRepliesByFid(
  fid: number,
  limit: number = 5
): Promise<ProfileReply[]> {
  if (!fid || fid <= 0) return [];

  // Fetch more than needed to account for filtering
  // Exclude self-replies (where parent author is the same as reply author)
  const rows = await prisma.$replica().$queryRaw<ReplyRow[]>`
    SELECT
      c.hash,
      c.text,
      c.timestamp AS "castTimestamp",
      c.root_parent_hash AS "rootParentHash",
      root.text AS "rootText",
      parent.text AS "parentText",
      parent.timestamp AS "parentTimestamp",
      COALESCE(parent_profile.fname, parent_profile.display_name) AS "parentUsername",
      c.mentions_positions_array AS "mentionsPositions",
      mp.profiles AS "mentionProfiles"
    FROM farcaster.casts c
    LEFT JOIN farcaster.casts root ON root.hash = c.root_parent_hash
    LEFT JOIN farcaster.casts parent ON parent.hash = c.parent_hash
    LEFT JOIN farcaster.profiles parent_profile ON parent_profile.fid = parent.fid
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object('fid', prof.fid, 'fname', prof.fname)
        ORDER BY mf.idx
      ) AS profiles
      FROM unnest(c.mentioned_fids) WITH ORDINALITY AS mf(fid, idx)
      JOIN farcaster.profiles prof ON prof.fid = mf.fid
    ) mp ON TRUE
    WHERE c.deleted_at IS NULL
      AND c.hidden_at IS NULL
      AND c.parent_hash IS NOT NULL
      AND c.root_parent_url = ${COBUILD_CHANNEL_URL}
      AND c.text IS NOT NULL
      AND btrim(c.text) <> ''
      AND length(btrim(c.text)) >= 3
      AND c.fid = ${fid}
      AND (parent.fid IS NULL OR parent.fid != ${fid})
    ORDER BY c.timestamp DESC NULLS LAST
    LIMIT ${limit * 3}
  `;

  return rows
    .filter(
      (row): row is ReplyRow & { text: string } => hasText(row.text) && isSubstantialText(row.text)
    )
    .map((row) => {
      const hash = bufferToHash(row.hash);
      const rootHash = bufferToHash(row.rootParentHash);
      const text = insertMentionsFromProfiles(row.text, row.mentionsPositions, row.mentionProfiles)
        .trim()
        .replace(/\s+/g, " ");
      const title = text.length > 200 ? `${text.slice(0, 197)}...` : text;

      const rootText = row.rootText?.trim().split("\n")[0] ?? "";
      const topicTitle = rootText.length > 50 ? `${rootText.slice(0, 47)}...` : rootText;

      // Build parent quote if parent exists and has text
      let parentQuote: ProfileReply["parentQuote"] = null;
      if (row.parentText && row.parentUsername) {
        const parentText = row.parentText.trim();
        parentQuote = {
          text: parentText.length > 300 ? `${parentText.slice(0, 297)}...` : parentText,
          username: row.parentUsername,
          createdAt: row.parentTimestamp?.toISOString() ?? new Date().toISOString(),
        };
      }

      return {
        hash: hash ?? "",
        title,
        createdAt: row.castTimestamp?.toISOString() ?? new Date().toISOString(),
        rootHash,
        topicTitle: topicTitle || null,
        parentQuote,
      };
    })
    .filter((reply) => reply.hash)
    .slice(0, limit);
}

export async function getRecentRepliesGroupedByFid(
  fid: number,
  limit: number = 10
): Promise<ProfileReplyGroup[]> {
  if (!fid || fid <= 0) return [];

  type GroupedReplyRow = {
    hash: Buffer;
    text: string | null;
    castTimestamp: Date | null;
    rootParentHash: Buffer | null;
    rootText: string | null;
    parentFid: bigint | null;
    parentText: string | null;
    parentUsername: string | null;
    mentionsPositions: number[] | null;
    mentionProfiles: Array<MentionProfileInput | null> | null;
  };

  // Fetch replies, excluding self-replies
  const rows = await prisma.$replica().$queryRaw<GroupedReplyRow[]>`
    SELECT
      c.hash,
      c.text,
      c.timestamp AS "castTimestamp",
      c.root_parent_hash AS "rootParentHash",
      root.text AS "rootText",
      parent.fid AS "parentFid",
      parent.text AS "parentText",
      COALESCE(parent_profile.fname, parent_profile.display_name) AS "parentUsername",
      c.mentions_positions_array AS "mentionsPositions",
      mp.profiles AS "mentionProfiles"
    FROM farcaster.casts c
    LEFT JOIN farcaster.casts root ON root.hash = c.root_parent_hash
    LEFT JOIN farcaster.casts parent ON parent.hash = c.parent_hash
    LEFT JOIN farcaster.profiles parent_profile ON parent_profile.fid = parent.fid
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object('fid', prof.fid, 'fname', prof.fname)
        ORDER BY mf.idx
      ) AS profiles
      FROM unnest(c.mentioned_fids) WITH ORDINALITY AS mf(fid, idx)
      JOIN farcaster.profiles prof ON prof.fid = mf.fid
    ) mp ON TRUE
    WHERE c.deleted_at IS NULL
      AND c.hidden_at IS NULL
      AND c.parent_hash IS NOT NULL
      AND c.root_parent_url = ${COBUILD_CHANNEL_URL}
      AND c.text IS NOT NULL
      AND btrim(c.text) <> ''
      AND length(btrim(c.text)) >= 3
      AND c.fid = ${fid}
      AND (parent.fid IS NULL OR parent.fid != ${fid})
    ORDER BY c.timestamp DESC NULLS LAST
    LIMIT ${limit * 2}
  `;

  // Group by rootHash
  const groupMap = new Map<string, ProfileReplyGroup>();

  for (const row of rows) {
    if (!hasText(row.text) || !isSubstantialText(row.text)) continue;

    const hash = bufferToHash(row.hash);
    const rootHash = bufferToHash(row.rootParentHash);
    if (!hash || !rootHash) continue;

    const text = insertMentionsFromProfiles(row.text, row.mentionsPositions, row.mentionProfiles)
      .trim()
      .replace(/\s+/g, " ");

    const rootText = row.rootText?.trim().split("\n")[0] ?? "";
    const topicTitle = rootText.length > 60 ? `${rootText.slice(0, 57)}...` : rootText;

    // Build parent quote
    let parentQuote: ProfileReplyGroup["replies"][number]["parentQuote"] = null;
    if (row.parentText && row.parentUsername) {
      parentQuote = {
        text: row.parentText.trim(),
        username: row.parentUsername,
      };
    }

    const reply = {
      hash,
      text,
      createdAt: row.castTimestamp?.toISOString() ?? new Date().toISOString(),
      parentQuote,
    };

    const existing = groupMap.get(rootHash);
    if (existing) {
      existing.replies.push(reply);
    } else {
      groupMap.set(rootHash, {
        rootHash,
        topicTitle: topicTitle || "Untitled thread",
        replies: [reply],
      });
    }
  }

  // Return groups, limited
  return Array.from(groupMap.values()).slice(0, limit);
}

export async function getProfileActivityByFid(
  fid: number,
  limits: { topicsLimit?: number; repliesLimit?: number } = {}
): Promise<ProfileActivity> {
  if (!fid || fid <= 0) return { topics: [], replies: [] };

  const { topicsLimit = 5, repliesLimit = 5 } = limits;
  const [topics, replies] = await Promise.all([
    getTopTopicsByFid(fid, topicsLimit),
    getRecentRepliesByFid(fid, repliesLimit),
  ]);

  return { topics, replies };
}
