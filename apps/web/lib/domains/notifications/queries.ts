import "server-only";

import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/server/db/cobuild-db-client";
import { normalizeAddress } from "@/lib/shared/address";
import type { NotificationsPageData, NotificationListItem, NotificationReason } from "./types";

export const NOTIFICATIONS_PAGE_SIZE = 20;

type CountRow = {
  count: bigint | number | null;
};

type WatermarkRow = {
  watermark: Date | null;
};

type NotificationRow = {
  id: bigint | number;
  kind: string;
  reason: string;
  eventAt: Date | null;
  createdAt: Date | null;
  lastReadAt: Date | null;
  sourceHash: Buffer | null;
  rootHash: Buffer | null;
  targetHash: Buffer | null;
  actorFid: bigint | number | null;
  actorUsername: string | null;
  actorDisplayName: string | null;
  actorAvatarUrl: string | null;
  sourceText: string | null;
  rootText: string | null;
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

function mapNotificationRow(row: NotificationRow): NotificationListItem {
  const actorName =
    row.actorUsername ??
    row.actorDisplayName ??
    (row.actorFid ? `fid:${toNumber(row.actorFid)}` : "Someone");

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
    isUnread: !row.lastReadAt || (row.createdAt?.getTime() ?? 0) > row.lastReadAt.getTime(),
    href: buildHref(row),
    sourceHash: bufferToHash(row.sourceHash),
    rootHash: bufferToHash(row.rootHash),
    targetHash: bufferToHash(row.targetHash),
    rootTitle: toRootTitle(row.rootText),
    sourceExcerpt: summarizeText(row.sourceText, 180),
    payload:
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : null,
  };
}

const buildVisibleNotificationsSql = (address: string) => Prisma.sql`
  FROM cobuild.notifications notification
  LEFT JOIN cobuild.notification_state state
    ON state.owner_address = notification.recipient_wallet_address
  LEFT JOIN farcaster.casts source
    ON source.hash = notification.source_cast_hash
  LEFT JOIN farcaster.casts root
    ON root.hash = notification.root_cast_hash
  LEFT JOIN farcaster.profiles actor
    ON actor.fid = notification.actor_fid
  WHERE notification.recipient_wallet_address = ${address}
    AND notification.invalidated_at IS NULL
    AND (
      notification.kind <> 'discussion'
      OR (
        source.hash IS NOT NULL
        AND source.deleted_at IS NULL
        AND source.hidden_at IS NULL
        AND source.text IS NOT NULL
        AND btrim(source.text) <> ''
        AND root.hash IS NOT NULL
        AND root.deleted_at IS NULL
        AND root.hidden_at IS NULL
        AND root.text IS NOT NULL
        AND btrim(root.text) <> ''
        AND (actor.fid IS NULL OR actor.hidden_at IS NULL)
        AND (
          actor.fid IS NULL
          OR (
            actor.neynar_user_score IS NOT NULL
            AND actor.neynar_user_score >= 0.55
          )
        )
      )
    )
`;

export async function getUnreadNotificationsCount(address: string): Promise<number> {
  let normalizedAddress: string;
  try {
    normalizedAddress = normalizeAddress(address);
  } catch {
    return 0;
  }

  const visibleSql = buildVisibleNotificationsSql(normalizedAddress);
  const rows = await prisma.$replica().$queryRaw<CountRow[]>`
    SELECT COUNT(*)::bigint AS count
    ${visibleSql}
    AND (
      state.last_read_at IS NULL
      OR notification.created_at > state.last_read_at
    )
  `;

  return toNumber(rows[0]?.count);
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
      watermark: new Date().toISOString(),
    };
  }

  const visibleSql = buildVisibleNotificationsSql(normalizedAddress);
  const countRows = await prisma.$replica().$queryRaw<CountRow[]>`
    SELECT COUNT(*)::bigint AS count
    ${visibleSql}
  `;
  const watermarkRows = await prisma.$replica().$queryRaw<WatermarkRow[]>`
    SELECT MAX(notification.created_at) AS watermark
    ${visibleSql}
  `;

  const totalCount = toNumber(countRows[0]?.count);
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / NOTIFICATIONS_PAGE_SIZE);
  const resolvedPage = totalPages === 0 ? 1 : Math.max(1, Math.min(page, totalPages));
  const offset = (resolvedPage - 1) * NOTIFICATIONS_PAGE_SIZE;
  const watermark = toIsoString(watermarkRows[0]?.watermark);

  const rows =
    totalCount === 0
      ? []
      : await prisma.$replica().$queryRaw<NotificationRow[]>`
          SELECT
            notification.id,
            notification.kind,
            notification.reason,
            notification.event_at AS "eventAt",
            notification.created_at AS "createdAt",
            state.last_read_at AS "lastReadAt",
            notification.source_cast_hash AS "sourceHash",
            notification.root_cast_hash AS "rootHash",
            notification.target_cast_hash AS "targetHash",
            notification.actor_fid AS "actorFid",
            actor.fname AS "actorUsername",
            actor.display_name AS "actorDisplayName",
            actor.avatar_url AS "actorAvatarUrl",
            source.text AS "sourceText",
            root.text AS "rootText",
            notification.payload
          ${visibleSql}
          ORDER BY notification.event_at DESC NULLS LAST, notification.created_at DESC, notification.id DESC
          LIMIT ${NOTIFICATIONS_PAGE_SIZE}
          OFFSET ${offset}
        `;

  return {
    items: rows.map(mapNotificationRow),
    page: resolvedPage,
    totalPages,
    totalCount,
    watermark,
  };
}

export async function markNotificationsRead(address: string, watermark: Date): Promise<void> {
  let normalizedAddress: string;
  try {
    normalizedAddress = normalizeAddress(address);
  } catch {
    return;
  }

  if (Number.isNaN(watermark.getTime())) {
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
      ${watermark},
      now(),
      now()
    )
    ON CONFLICT (owner_address) DO UPDATE
    SET
      last_read_at = GREATEST(
        COALESCE(cobuild.notification_state.last_read_at, to_timestamp(0)),
        EXCLUDED.last_read_at
      ),
      updated_at = now()
  `;
}
