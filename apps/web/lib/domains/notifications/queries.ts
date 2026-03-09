import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { MentionProfileInput } from "@/lib/integrations/farcaster/mentions";
import { insertMentionsFromProfiles } from "@/lib/integrations/farcaster/mentions";
import { NEYNAR_SCORE_THRESHOLD } from "@/lib/integrations/farcaster/casts/shared";
import { buildRenderableCastSql } from "@/lib/integrations/farcaster/casts/thread/sql";
import prisma from "@/lib/server/db/cobuild-db-client";
import { normalizeAddress } from "@/lib/shared/address";
import type {
  NotificationsPageData,
  NotificationListItem,
  NotificationReason,
  NotificationsUnreadState,
} from "./types";

export const NOTIFICATIONS_PAGE_SIZE = 20;
export const NOTIFICATION_WATERMARK_PATTERN = /^[0-9]{1,20}$/;

type CountRow = {
  count: bigint | number | null;
};

type WatermarkRow = {
  watermark: string | null;
};

type NotificationRow = {
  id: bigint | number;
  kind: string;
  reason: string;
  eventAt: Date | null;
  createdAt: Date | null;
  lastReadAt: Date | null;
  isUnread: boolean;
  sourceHash: Buffer | null;
  rootHash: Buffer | null;
  targetHash: Buffer | null;
  actorFid: bigint | number | null;
  actorUsername: string | null;
  actorDisplayName: string | null;
  actorAvatarUrl: string | null;
  sourceText: string | null;
  sourceMentionsPositions: number[] | null;
  sourceMentionProfiles: Prisma.JsonValue | null;
  rootText: string | null;
  rootMentionsPositions: number[] | null;
  rootMentionProfiles: Prisma.JsonValue | null;
  payload: Prisma.JsonValue | null;
};

function toNumber(value: bigint | number | null | undefined): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
}

function toIsoString(value: Date | null | undefined): string {
  return (value ?? new Date(0)).toISOString();
}

function bufferToHash(buffer: Buffer | null): string | null {
  if (!buffer) return null;
  return `0x${Buffer.from(buffer).toString("hex")}`;
}

function summarizeText(text: string | null | undefined, maxLength: number): string | null {
  if (!text) return null;
  const compact = text.trim().replace(/\s+/g, " ");
  if (!compact) return null;
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 3)}...`;
}

function toRootTitle(text: string | null | undefined): string | null {
  if (!text) return null;
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  return summarizeText(firstLine ?? null, 80);
}

function buildHref(row: NotificationRow): string | null {
  if (row.kind !== "discussion") return null;
  const sourceHash = bufferToHash(row.sourceHash);
  const rootHash = bufferToHash(row.rootHash);
  if (!sourceHash) return null;
  if (!rootHash || sourceHash === rootHash) {
    return `/cast/${sourceHash}`;
  }
  return `/cast/${rootHash}?post=${sourceHash}`;
}

function toMentionProfiles(
  value: Prisma.JsonValue | null | undefined
): Array<MentionProfileInput | null> | null {
  return Array.isArray(value) ? (value as Array<MentionProfileInput | null>) : null;
}

function buildRenderedText(
  text: string | null | undefined,
  mentionPositions: number[] | null | undefined,
  mentionProfiles: Prisma.JsonValue | null | undefined
): string | null {
  const rendered = insertMentionsFromProfiles(
    text ?? null,
    mentionPositions ?? null,
    toMentionProfiles(mentionProfiles)
  );
  return rendered.trim() ? rendered : null;
}

function mapNotificationRow(row: NotificationRow): NotificationListItem {
  const actorName =
    row.actorUsername ??
    row.actorDisplayName ??
    (row.actorFid ? `fid:${toNumber(row.actorFid)}` : "Someone");
  const sourceText = buildRenderedText(
    row.sourceText,
    row.sourceMentionsPositions,
    row.sourceMentionProfiles
  );
  const rootText = buildRenderedText(
    row.rootText,
    row.rootMentionsPositions,
    row.rootMentionProfiles
  );

  return {
    id: String(row.id),
    kind: (row.kind === "discussion" || row.kind === "payment" || row.kind === "protocol"
      ? row.kind
      : "discussion") as NotificationListItem["kind"],
    reason: row.reason as NotificationReason,
    actor:
      row.actorFid || row.actorUsername || row.actorDisplayName || row.actorAvatarUrl
        ? {
            fid: row.actorFid == null ? null : toNumber(row.actorFid),
            name: actorName,
            username: row.actorUsername,
            avatarUrl: row.actorAvatarUrl,
          }
        : null,
    eventAt: toIsoString(row.eventAt),
    createdAt: toIsoString(row.createdAt),
    isUnread: row.isUnread,
    href: buildHref(row),
    sourceHash: bufferToHash(row.sourceHash),
    rootHash: bufferToHash(row.rootHash),
    targetHash: bufferToHash(row.targetHash),
    rootTitle: toRootTitle(rootText),
    sourceExcerpt: summarizeText(sourceText, 180),
    payload:
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : null,
  };
}

const buildNotificationFromSql = Prisma.sql`
  FROM cobuild.notifications notification
  LEFT JOIN cobuild.notification_state state
    ON state.owner_address = notification.recipient_wallet_address
  LEFT JOIN farcaster.casts source
    ON source.hash = notification.source_cast_hash
  LEFT JOIN farcaster.casts root
    ON root.hash = notification.root_cast_hash
  LEFT JOIN farcaster.casts target
    ON target.hash = notification.target_cast_hash
  LEFT JOIN farcaster.profiles actor
    ON actor.fid = notification.actor_fid
  LEFT JOIN farcaster.profiles root_author
    ON root_author.fid = root.fid
`;

const buildVisibleNotificationsWhereSql = (address: string) => Prisma.sql`
  WHERE notification.recipient_wallet_address = ${address}
    AND notification.invalidated_at IS NULL
    AND (
      notification.kind <> 'discussion'
      OR (
        source.hash IS NOT NULL
        AND source.deleted_at IS NULL
        AND source.hidden_at IS NULL
        AND ${buildRenderableCastSql("source")}
        AND root.hash IS NOT NULL
        AND root.deleted_at IS NULL
        AND root.hidden_at IS NULL
        AND ${buildRenderableCastSql("root")}
        AND root_author.fid IS NOT NULL
        AND root_author.hidden_at IS NULL
        AND root_author.neynar_user_score IS NOT NULL
        AND root_author.neynar_user_score >= ${NEYNAR_SCORE_THRESHOLD}
        AND actor.fid IS NOT NULL
        AND actor.hidden_at IS NULL
        AND actor.neynar_user_score IS NOT NULL
        AND actor.neynar_user_score >= ${NEYNAR_SCORE_THRESHOLD}
        AND (
          notification.reason <> 'reply_to_reply'
          OR (
            target.hash IS NOT NULL
            AND target.deleted_at IS NULL
            AND target.hidden_at IS NULL
            AND ${buildRenderableCastSql("target")}
          )
        )
      )
    )
`;

async function getUnreadNotificationsStateInternal(
  address: string,
  db: Pick<typeof prisma, "$queryRaw">
): Promise<NotificationsUnreadState> {
  const visibleWhereSql = buildVisibleNotificationsWhereSql(address);
  const rows = await db.$queryRaw<
    Array<{ count: bigint | number | null; watermark: string | null }>
  >`
    SELECT
      COUNT(*)::bigint AS count,
      COALESCE(
        (EXTRACT(EPOCH FROM MAX(notification.created_at)) * 1000000)::bigint::text,
        '0'
      ) AS watermark
    ${buildNotificationFromSql}
    ${visibleWhereSql}
    AND (
      state.last_read_at IS NULL
      OR notification.created_at > state.last_read_at
    )
  `;

  return {
    count: toNumber(rows[0]?.count),
    watermark: rows[0]?.watermark ?? "0",
  };
}

export async function getUnreadNotificationsState(
  address: string
): Promise<NotificationsUnreadState> {
  let normalizedAddress: string;
  try {
    normalizedAddress = normalizeAddress(address);
  } catch {
    return { count: 0, watermark: "0" };
  }

  return getUnreadNotificationsStateInternal(normalizedAddress, prisma.$replica());
}

export async function getUnreadNotificationsCount(address: string): Promise<number> {
  return (await getUnreadNotificationsState(address)).count;
}

export async function getNotificationsPage(
  address: string,
  page: number = 1
): Promise<NotificationsPageData> {
  let normalizedAddress: string;
  try {
    normalizedAddress = normalizeAddress(address);
  } catch {
    return {
      items: [],
      page: 1,
      totalPages: 0,
      totalCount: 0,
      unreadCount: 0,
      watermark: "0",
    };
  }

  const db = prisma.$primary();
  const visibleWhereSql = buildVisibleNotificationsWhereSql(normalizedAddress);
  const unreadState = await getUnreadNotificationsStateInternal(normalizedAddress, db);

  const countRows = await db.$queryRaw<CountRow[]>`
    SELECT COUNT(*)::bigint AS count
    ${buildNotificationFromSql}
    ${visibleWhereSql}
  `;
  const watermarkRows = await db.$queryRaw<WatermarkRow[]>`
    SELECT COALESCE(
      (EXTRACT(EPOCH FROM MAX(notification.created_at)) * 1000000)::bigint::text,
      '0'
    ) AS watermark
    ${buildNotificationFromSql}
    ${visibleWhereSql}
  `;

  const totalCount = toNumber(countRows[0]?.count);
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / NOTIFICATIONS_PAGE_SIZE);
  const resolvedPage = totalPages === 0 ? 1 : Math.max(1, Math.min(page, totalPages));
  const offset = (resolvedPage - 1) * NOTIFICATIONS_PAGE_SIZE;
  const watermark = watermarkRows[0]?.watermark ?? "0";

  const rows =
    totalCount === 0
      ? []
      : await db.$queryRaw<NotificationRow[]>`
          SELECT
            notification.id,
            notification.kind,
            notification.reason,
            notification.event_at AS "eventAt",
            notification.created_at AS "createdAt",
            state.last_read_at AS "lastReadAt",
            (
              state.last_read_at IS NULL
              OR notification.created_at > state.last_read_at
            ) AS "isUnread",
            notification.source_cast_hash AS "sourceHash",
            notification.root_cast_hash AS "rootHash",
            notification.target_cast_hash AS "targetHash",
            notification.actor_fid AS "actorFid",
            actor.fname AS "actorUsername",
            actor.display_name AS "actorDisplayName",
            actor.avatar_url AS "actorAvatarUrl",
            source.text AS "sourceText",
            source.mentions_positions_array AS "sourceMentionsPositions",
            source_mentions.profiles AS "sourceMentionProfiles",
            root.text AS "rootText",
            root.mentions_positions_array AS "rootMentionsPositions",
            root_mentions.profiles AS "rootMentionProfiles",
            notification.payload
          ${buildNotificationFromSql}
          LEFT JOIN LATERAL (
            SELECT jsonb_agg(
              jsonb_build_object('fid', profile.fid, 'fname', profile.fname)
              ORDER BY mention.idx
            ) AS profiles
            FROM unnest(source.mentioned_fids) WITH ORDINALITY AS mention(fid, idx)
            JOIN farcaster.profiles profile ON profile.fid = mention.fid
          ) source_mentions ON TRUE
          LEFT JOIN LATERAL (
            SELECT jsonb_agg(
              jsonb_build_object('fid', profile.fid, 'fname', profile.fname)
              ORDER BY mention.idx
            ) AS profiles
            FROM unnest(root.mentioned_fids) WITH ORDINALITY AS mention(fid, idx)
            JOIN farcaster.profiles profile ON profile.fid = mention.fid
          ) root_mentions ON TRUE
          ${visibleWhereSql}
          ORDER BY notification.event_at DESC NULLS LAST, notification.created_at DESC, notification.id DESC
          LIMIT ${NOTIFICATIONS_PAGE_SIZE}
          OFFSET ${offset}
        `;

  return {
    items: rows.map(mapNotificationRow),
    page: resolvedPage,
    totalPages,
    totalCount,
    unreadCount: unreadState.count,
    watermark,
  };
}

function parseWatermarkMicros(value: string): bigint | null {
  if (!NOTIFICATION_WATERMARK_PATTERN.test(value)) {
    return null;
  }

  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export async function markNotificationsRead(address: string, watermark: string): Promise<void> {
  let normalizedAddress: string;
  try {
    normalizedAddress = normalizeAddress(address);
  } catch {
    return;
  }

  const watermarkMicros = parseWatermarkMicros(watermark);
  if (watermarkMicros === null) {
    return;
  }

  await prisma.$primary().$executeRaw`
    INSERT INTO cobuild.notification_state (
      owner_address,
      last_read_at,
      created_at,
      updated_at
    )
    VALUES (
      ${normalizedAddress},
      TIMESTAMPTZ 'epoch' + ${watermarkMicros} * interval '1 microsecond',
      now(),
      now()
    )
    ON CONFLICT (owner_address) DO UPDATE
    SET
      last_read_at = GREATEST(
        COALESCE(cobuild.notification_state.last_read_at, TIMESTAMPTZ 'epoch'),
        EXCLUDED.last_read_at
      ),
      updated_at = now()
  `;
}
