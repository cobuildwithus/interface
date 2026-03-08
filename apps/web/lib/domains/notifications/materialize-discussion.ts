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

export async function materializeDiscussionNotifications(
  sourceHashes: ReadonlyArray<Buffer | null | undefined>
): Promise<number> {
  const unique = uniqueBuffers(sourceHashes);
  if (unique.length === 0) return 0;

  const hashesSql = Prisma.join(unique.map((hash) => Prisma.sql`${hash}`));
  const rows = await prisma.$primary().$queryRaw<MaterializeCountRow[]>`
    SELECT cobuild.materialize_discussion_notifications(ARRAY[${hashesSql}]::bytea[])::bigint AS count
  `;

  const value = rows[0]?.count;
  return typeof value === "bigint" ? Number(value) : typeof value === "number" ? value : 0;
}
