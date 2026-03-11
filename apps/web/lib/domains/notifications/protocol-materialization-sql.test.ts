import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sqlPath = path.join(process.cwd(), "prisma/sql/2026-03-10-protocol-notifications.sql");
const discussionSqlPath = path.join(process.cwd(), "prisma/sql/2026-03-08-notifications.sql");

type ScheduleRow = {
  id: string;
  recipientWalletAddress: string | null;
  sourceType: string;
  sourceId: string;
};

type OutboxRow = {
  id: string;
  recipientWalletAddress: string | null;
  sourceType: string;
  sourceId: string;
  action: string | null;
  blockNumber: number;
  logIndex: number;
};

function normalizedAddress(value: string | null): string | null {
  const trimmed = value?.trim().toLowerCase() ?? null;
  if (!trimmed) return null;
  return /^0x[0-9a-f]{40}$/.test(trimmed) ? trimmed : null;
}

function keyFor(row: {
  recipientWalletAddress: string | null;
  sourceType: string;
  sourceId: string;
}): string | null {
  const recipientWalletAddress = normalizedAddress(row.recipientWalletAddress);
  if (!recipientWalletAddress) return null;
  return [recipientWalletAddress, row.sourceType, row.sourceId].join(":");
}

function modeledMaterializedScheduleIds(args: {
  schedules: ScheduleRow[];
  outboxRows: OutboxRow[];
}): string[] {
  const targetKeys = new Set(
    args.schedules
      .map((schedule) => keyFor(schedule))
      .filter((value): value is string => value !== null)
  );

  const latestOutboxByKey = new Map<string, string>();
  const orderedOutboxRows = args.outboxRows
    .map((row) => ({ ...row, key: keyFor(row) }))
    .filter((row): row is OutboxRow & { key: string } => row.key !== null)
    .filter((row) => targetKeys.has(row.key))
    .sort((left, right) => {
      const recipientWalletAddress = left.key.localeCompare(right.key);
      if (recipientWalletAddress !== 0) return recipientWalletAddress;
      if (left.blockNumber !== right.blockNumber) return right.blockNumber - left.blockNumber;
      if (left.logIndex !== right.logIndex) return right.logIndex - left.logIndex;
      return right.id.localeCompare(left.id);
    });

  for (const row of orderedOutboxRows) {
    if (!latestOutboxByKey.has(row.key)) {
      latestOutboxByKey.set(row.key, row.action ?? "upsert");
    }
  }

  return args.schedules
    .filter((schedule) => {
      const key = keyFor(schedule);
      if (!key) return false;
      return (latestOutboxByKey.get(key) ?? "upsert") !== "invalidate";
    })
    .map((schedule) => schedule.id);
}

function sqlForFunction(sql: string, functionName: string): string {
  const startToken = `CREATE OR REPLACE FUNCTION cobuild.${functionName}`;
  const startIndex = sql.indexOf(startToken);
  if (startIndex === -1) {
    throw new Error(`Missing SQL definition for ${functionName}`);
  }

  const endIndex = sql.indexOf("\n$$;", startIndex);
  if (endIndex === -1) {
    throw new Error(`Missing SQL terminator for ${functionName}`);
  }

  return sql.slice(startIndex, endIndex + "\n$$;".length);
}

function conflictUpdateSetClause(sql: string, functionName: string): string {
  const functionSql = sqlForFunction(sql, functionName);
  const match = functionSql.match(
    /ON CONFLICT \(recipient_wallet_address, source_type, source_id\) DO UPDATE\s+SET\s+([\s\S]*?)\s+RETURNING 1/
  );

  if (!match?.[1]) {
    throw new Error(`Missing ON CONFLICT update block for ${functionName}`);
  }

  return match[1];
}

function modeledIsUnread(args: {
  createdAt: string;
  notificationId: number;
  lastReadAt: string | null;
  lastReadNotificationId: number | null;
}): boolean {
  if (!args.lastReadAt) return true;

  const createdAt = Date.parse(args.createdAt);
  const lastReadAt = Date.parse(args.lastReadAt);
  if (createdAt > lastReadAt) return true;
  return createdAt === lastReadAt && args.notificationId > (args.lastReadNotificationId ?? 0);
}

function modeledUnreadAfterReopen(args: {
  originalCreatedAt: string;
  reopenedAt: string;
  notificationId: number;
  lastReadAt: string;
  lastReadNotificationId: number;
  resetsCreatedAtOnReopen: boolean;
}): boolean {
  return modeledIsUnread({
    createdAt: args.resetsCreatedAtOnReopen ? args.reopenedAt : args.originalCreatedAt,
    notificationId: args.notificationId,
    lastReadAt: args.lastReadAt,
    lastReadNotificationId: args.lastReadNotificationId,
  });
}

describe("protocol notification schedule SQL", () => {
  it("pins the profile-fid discussion rematerializer wrapper predicates and delegation", () => {
    const discussionSql = readFileSync(discussionSqlPath, "utf8");
    const functionSql = sqlForFunction(
      discussionSql,
      "materialize_discussion_notifications_for_profile_fids"
    );

    expect(functionSql).toContain("WHERE target.fid IS NOT NULL");
    expect(functionSql).toContain("AND target.fid > 0");
    expect(functionSql).toContain("source.parent_fid = ANY(target.fids)");
    expect(functionSql).toContain("source.mentioned_fids && target.fids");
    expect(functionSql).not.toContain("source.fid = ANY(target.fids)");
    expect(functionSql).not.toContain("root.fid = ANY(target.fids)");
    expect(functionSql).toContain("SELECT cobuild.materialize_discussion_notifications(");
  });

  it("preserves existing inbox created_at in both protocol re-materialization paths", () => {
    const sql = readFileSync(sqlPath, "utf8");
    const discussionSql = readFileSync(discussionSqlPath, "utf8");
    const discussionSetClause = conflictUpdateSetClause(
      discussionSql,
      "materialize_discussion_notifications"
    );
    const protocolSetClauses = [
      conflictUpdateSetClause(sql, "materialize_protocol_notifications"),
      conflictUpdateSetClause(sql, "materialize_protocol_notification_schedules"),
    ];

    expect(discussionSetClause).toContain("invalidated_at = NULL");
    expect(discussionSetClause).toContain("updated_at = clock_timestamp()");

    for (const setClause of protocolSetClauses) {
      expect(setClause).toContain("invalidated_at = NULL");
      expect(setClause).toContain("updated_at = clock_timestamp()");
      expect(setClause).not.toMatch(/\bcreated_at\s*=/);
    }
  });

  it("models why preserving created_at keeps reopened protocol rows from becoming unread again", () => {
    const args = {
      originalCreatedAt: "2026-03-08T10:00:00.000Z",
      reopenedAt: "2026-03-09T10:00:00.000Z",
      notificationId: 42,
      lastReadAt: "2026-03-08T10:00:00.000Z",
      lastReadNotificationId: 42,
    };

    expect(modeledUnreadAfterReopen({ ...args, resetsCreatedAtOnReopen: false })).toBe(false);
    expect(modeledUnreadAfterReopen({ ...args, resetsCreatedAtOnReopen: true })).toBe(true);
  });

  it("pins the latest outbox ordering and join keys used to suppress stale reopens", () => {
    const sql = readFileSync(sqlPath, "utf8");

    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION cobuild.materialize_protocol_notification_schedules"
    );
    expect(sql).toMatch(
      /SELECT DISTINCT ON \(\s*lower\(trim\(outbox\.recipient_wallet_address\)\),\s*outbox\.source_type,\s*outbox\.source_id/s
    );
    expect(sql).toMatch(
      /ORDER BY\s+lower\(trim\(outbox\.recipient_wallet_address\)\),\s*outbox\.source_type,\s*outbox\.source_id,\s*outbox\.block_number DESC,\s*outbox\.log_index DESC,\s*outbox\.id DESC/s
    );
    expect(sql).toMatch(
      /LEFT JOIN latest_outbox\s+ON latest_outbox\.recipient_wallet_address = selected\.recipient_wallet_address\s+AND latest_outbox\.source_type = selected\.source_type\s+AND latest_outbox\.source_id = selected\.source_id/s
    );
    expect(sql).toContain("WHERE coalesce(latest_outbox.action, 'upsert') <> 'invalidate'");
  });

  it("models the stale-reopen regression with an older upsert and newer invalidate", () => {
    expect(
      modeledMaterializedScheduleIds({
        schedules: [
          {
            id: "schedule-1",
            recipientWalletAddress: "0x00000000000000000000000000000000000000aa",
            sourceType: "challenge_window_reminder",
            sourceId: "source-1",
          },
        ],
        outboxRows: [
          {
            id: "outbox-1",
            recipientWalletAddress: "0x00000000000000000000000000000000000000aa",
            sourceType: "challenge_window_reminder",
            sourceId: "source-1",
            action: "upsert",
            blockNumber: 100,
            logIndex: 5,
          },
          {
            id: "outbox-2",
            recipientWalletAddress: "0x00000000000000000000000000000000000000aa",
            sourceType: "challenge_window_reminder",
            sourceId: "source-1",
            action: "invalidate",
            blockNumber: 101,
            logIndex: 0,
          },
        ],
      })
    ).toEqual([]);
  });

  it("allows materialization when a newer upsert supersedes an earlier invalidate", () => {
    expect(
      modeledMaterializedScheduleIds({
        schedules: [
          {
            id: "schedule-1",
            recipientWalletAddress: "0x00000000000000000000000000000000000000aa",
            sourceType: "challenge_window_reminder",
            sourceId: "source-1",
          },
        ],
        outboxRows: [
          {
            id: "outbox-1",
            recipientWalletAddress: "0x00000000000000000000000000000000000000aa",
            sourceType: "challenge_window_reminder",
            sourceId: "source-1",
            action: "invalidate",
            blockNumber: 100,
            logIndex: 5,
          },
          {
            id: "outbox-2",
            recipientWalletAddress: "0x00000000000000000000000000000000000000aa",
            sourceType: "challenge_window_reminder",
            sourceId: "source-1",
            action: "upsert",
            blockNumber: 101,
            logIndex: 0,
          },
        ],
      })
    ).toEqual(["schedule-1"]);
  });
});
