import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sqlPath = path.join(process.cwd(), "prisma/sql/2026-03-10-protocol-notifications.sql");

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

describe("protocol notification schedule SQL", () => {
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
