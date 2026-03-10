import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { MentionProfileInput } from "@/lib/integrations/farcaster/mentions";
import { insertMentionsFromProfiles } from "@/lib/integrations/farcaster/mentions";
import { NEYNAR_SCORE_THRESHOLD } from "@/lib/integrations/farcaster/casts/shared";
import {
  buildMentionProfilesAggSql,
  buildRenderableCastSql,
} from "@/lib/integrations/farcaster/casts/thread/sql";
import prisma from "@/lib/server/db/cobuild-db-client";
import { normalizeAddress } from "@/lib/shared/address";
import { buildProtocolNotificationPresentation } from "./presentation";
import type {
  NotificationsPageData,
  NotificationListItem,
  NotificationReason,
  NotificationsUnreadState,
} from "./types";

export const NOTIFICATIONS_PAGE_SIZE = 20;
export const NOTIFICATION_WATERMARK_PATTERN = /^[0-9]{1,20}:[0-9]{1,20}$/;

type CountRow = {
  count: bigint | number | null;
};

type WatermarkRow = { watermark: string | null };

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
  actorWalletAddress: string | null;
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

function normalizeWatermark(value: string | null | undefined): string {
  return typeof value === "string" && NOTIFICATION_WATERMARK_PATTERN.test(value) ? value : "0:0";
}

function parseWatermarkParts(
  value: string | null | undefined
): { micros: bigint; notificationId: bigint } | null {
  if (typeof value !== "string" || !NOTIFICATION_WATERMARK_PATTERN.test(value)) {
    return null;
  }

  const [microsRaw, notificationIdRaw] = value.split(":");
  if (!microsRaw || !notificationIdRaw) return null;

  try {
    return {
      micros: BigInt(microsRaw),
      notificationId: BigInt(notificationIdRaw),
    };
  } catch {
    return null;
  }
}

function bufferToHash(buffer: Buffer | null): string | null {
  if (!buffer) return null;
  return `0x${Buffer.from(buffer).toString("hex")}`;
}

function notificationColumn(alias: string, column: string): Prisma.Sql {
  return Prisma.raw(`${alias}.${column}`);
}

function buildNotificationCursorSql(alias: string): Prisma.Sql {
  const createdAt = notificationColumn(alias, "created_at");
  const id = notificationColumn(alias, "id");

  return Prisma.sql`
    ((EXTRACT(EPOCH FROM ${createdAt}) * 1000000)::bigint::text || ':' || ${id}::bigint::text)
  `;
}

const NOTIFICATION_UNREAD_SQL = Prisma.sql`
  (
    state.last_read_at IS NULL
    OR notification.created_at > state.last_read_at
    OR (
      notification.created_at = state.last_read_at
      AND notification.id > COALESCE(state.last_read_notification_id, 0)
    )
  )
`;

function normalizeText(text: string | null | undefined): string | null {
  if (!text) return null;
  const compact = text.trim().replace(/\s+/g, " ");
  return compact || null;
}

function summarizeText(text: string | null | undefined, maxLength: number): string | null {
  const compact = normalizeText(text);
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
  if (row.kind === "protocol") {
    const payload =
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : null;
    return buildProtocolNotificationPresentation({
      reason: row.reason,
      payload,
      actorWalletAddress: row.actorWalletAddress,
    }).href;
  }
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
  const payload =
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : null;
  const protocolPresentation =
    row.kind === "protocol"
      ? buildProtocolNotificationPresentation({
          reason: row.reason,
          payload,
          actorWalletAddress: row.actorWalletAddress,
        })
      : null;
  const actorName =
    protocolPresentation?.actorName ??
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
      row.actorFid ||
      row.actorWalletAddress ||
      row.actorUsername ||
      row.actorDisplayName ||
      row.actorAvatarUrl ||
      protocolPresentation?.actorName
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
    rootTitle: protocolPresentation?.title ?? toRootTitle(rootText),
    sourceExcerpt: protocolPresentation?.excerpt ?? normalizeText(sourceText),
    payload,
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
  const rows = await db.$queryRaw<Array<{ count: bigint | number | null; watermark: string }>>`
    WITH unread AS (
      SELECT
        notification.created_at,
        notification.id,
        ${buildNotificationCursorSql("notification")} AS cursor
      ${buildNotificationFromSql}
      ${visibleWhereSql}
      AND ${NOTIFICATION_UNREAD_SQL}
    )
    SELECT
      COUNT(*)::bigint AS count,
      COALESCE(
        (
          SELECT cursor
          FROM unread
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        ),
        '0:0'
      ) AS watermark
    FROM unread
  `;

  return {
    count: toNumber(rows[0]?.count),
    watermark: normalizeWatermark(rows[0]?.watermark),
  };
}

export async function getUnreadNotificationsState(
  address: string
): Promise<NotificationsUnreadState> {
  let normalizedAddress: string;
  try {
    normalizedAddress = normalizeAddress(address);
  } catch {
    return { count: 0, watermark: "0:0" };
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
      watermark: "0:0",
    };
  }

  const db = prisma.$primary();
  return db.$transaction(
    async (tx) => {
      const visibleWhereSql = buildVisibleNotificationsWhereSql(normalizedAddress);
      const unreadState = await getUnreadNotificationsStateInternal(normalizedAddress, tx);

      const countRows = await tx.$queryRaw<CountRow[]>`
        SELECT COUNT(*)::bigint AS count
        ${buildNotificationFromSql}
        ${visibleWhereSql}
      `;
      const watermarkRows = await tx.$queryRaw<WatermarkRow[]>`
        SELECT COALESCE(${buildNotificationCursorSql("notification")}, '0:0') AS watermark
        ${buildNotificationFromSql}
        ${visibleWhereSql}
        ORDER BY notification.created_at DESC, notification.id DESC
        LIMIT 1
      `;

      const totalCount = toNumber(countRows[0]?.count);
      const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / NOTIFICATIONS_PAGE_SIZE);
      const resolvedPage = totalPages === 0 ? 1 : Math.max(1, Math.min(page, totalPages));
      const offset = (resolvedPage - 1) * NOTIFICATIONS_PAGE_SIZE;
      const watermark = normalizeWatermark(watermarkRows[0]?.watermark);

      const rows =
        totalCount === 0
          ? []
          : await tx.$queryRaw<NotificationRow[]>`
              SELECT
                notification.id,
                notification.kind,
                notification.reason,
                notification.event_at AS "eventAt",
                notification.created_at AS "createdAt",
                state.last_read_at AS "lastReadAt",
                ${NOTIFICATION_UNREAD_SQL} AS "isUnread",
                notification.source_cast_hash AS "sourceHash",
                notification.root_cast_hash AS "rootHash",
                notification.target_cast_hash AS "targetHash",
                notification.actor_fid AS "actorFid",
                notification.actor_wallet_address AS "actorWalletAddress",
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
                SELECT ${buildMentionProfilesAggSql("source")} AS profiles
              ) source_mentions ON TRUE
              LEFT JOIN LATERAL (
                SELECT ${buildMentionProfilesAggSql("root")} AS profiles
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
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    }
  );
}

export async function markNotificationsRead(address: string, watermark: string): Promise<void> {
  let normalizedAddress: string;
  try {
    normalizedAddress = normalizeAddress(address);
  } catch {
    return;
  }

  const watermarkParts = parseWatermarkParts(watermark);
  if (!watermarkParts) {
    return;
  }

  await prisma.$primary().$executeRaw`
    INSERT INTO cobuild.notification_state (
      owner_address,
      last_read_at,
      last_read_notification_id,
      created_at,
      updated_at
    )
    VALUES (
      ${normalizedAddress},
      TIMESTAMPTZ 'epoch' + ${watermarkParts.micros} * interval '1 microsecond',
      ${watermarkParts.notificationId},
      clock_timestamp(),
      clock_timestamp()
    )
    ON CONFLICT (owner_address) DO UPDATE
    SET
      last_read_at = CASE
        WHEN cobuild.notification_state.last_read_at IS NULL THEN EXCLUDED.last_read_at
        WHEN EXCLUDED.last_read_at > cobuild.notification_state.last_read_at THEN EXCLUDED.last_read_at
        WHEN EXCLUDED.last_read_at = cobuild.notification_state.last_read_at
          AND EXCLUDED.last_read_notification_id >
              COALESCE(cobuild.notification_state.last_read_notification_id, 0)
          THEN EXCLUDED.last_read_at
        ELSE cobuild.notification_state.last_read_at
      END,
      last_read_notification_id = CASE
        WHEN cobuild.notification_state.last_read_at IS NULL THEN EXCLUDED.last_read_notification_id
        WHEN EXCLUDED.last_read_at > cobuild.notification_state.last_read_at THEN EXCLUDED.last_read_notification_id
        WHEN EXCLUDED.last_read_at = cobuild.notification_state.last_read_at
          AND EXCLUDED.last_read_notification_id >
              COALESCE(cobuild.notification_state.last_read_notification_id, 0)
          THEN EXCLUDED.last_read_notification_id
        ELSE cobuild.notification_state.last_read_notification_id
      END,
      updated_at = clock_timestamp()
  `;
}
