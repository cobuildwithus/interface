import "server-only";

import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/server/db/cobuild-db-client";

type MaterializeCountRow = {
  count: bigint | number | null;
};

function uniqueBuffers(buffers: ReadonlyArray<Buffer | null | undefined>): Buffer[] {
  const byHex = new Map<string, Buffer>();
  for (const buffer of buffers) {
    if (!buffer || buffer.length === 0) continue;
    byHex.set(buffer.toString("hex"), buffer);
  }
  return Array.from(byHex.values());
}

function uniqueProfileFids(
  fids: ReadonlyArray<number | string | bigint | null | undefined>
): bigint[] {
  const byValue = new Map<string, bigint>();

  for (const fid of fids) {
    let normalized: bigint | null = null;
    if (typeof fid === "bigint") {
      normalized = fid;
    } else if (typeof fid === "number") {
      normalized = Number.isSafeInteger(fid) ? BigInt(fid) : null;
    } else if (typeof fid === "string") {
      const trimmed = fid.trim();
      normalized = /^\d+$/.test(trimmed) ? BigInt(trimmed) : null;
    }

    if (normalized === null || normalized <= 0n) continue;
    byValue.set(normalized.toString(), normalized);
  }

  return Array.from(byValue.values());
}

function toCount(value: bigint | number | null | undefined): number {
  return typeof value === "bigint" ? Number(value) : typeof value === "number" ? value : 0;
}

export async function materializeDiscussionNotifications(
  sourceHashes: ReadonlyArray<Buffer | null | undefined>
): Promise<number> {
  const unique = uniqueBuffers(sourceHashes);
  if (unique.length === 0) return 0;

  const hashesSql = Prisma.join(unique.map((hash) => Prisma.sql`${hash}`));
  const rows = await prisma.$primary().$queryRaw<MaterializeCountRow[]>`
    SELECT cobuild.materialize_discussion_notifications(ARRAY[${hashesSql}]::bytea[])::bigint AS count
  `;

  return toCount(rows[0]?.count);
}

export async function materializeDiscussionNotificationsForProfileFids(
  profileFids: ReadonlyArray<number | string | bigint | null | undefined>
): Promise<number> {
  const unique = uniqueProfileFids(profileFids);
  if (unique.length === 0) return 0;

  const fidsSql = Prisma.join(unique.map((fid) => Prisma.sql`${fid}`));
  const rows = await prisma.$primary().$queryRaw<MaterializeCountRow[]>`
    SELECT cobuild.materialize_discussion_notifications_for_profile_fids(
      ARRAY[${fidsSql}]::bigint[]
    )::bigint AS count
  `;

  return toCount(rows[0]?.count);
}
