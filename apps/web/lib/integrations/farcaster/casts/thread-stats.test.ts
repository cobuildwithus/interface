import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

import { updateThreadStatsForRoots } from "./thread-stats";

const executeRawMock = vi.fn();

type SqlChunk =
  | string
  | Prisma.Sql
  | readonly SqlChunk[]
  | {
      sql?: string;
      text?: string;
      strings?: string[];
      values?: readonly SqlChunk[];
    }
  | null
  | undefined;

const collectSqlChunks = (value: SqlChunk, acc: string[] = []): string[] => {
  if (typeof value === "string") {
    acc.push(value);
    return acc;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectSqlChunks(entry, acc));
    return acc;
  }
  if (!value || typeof value !== "object") {
    return acc;
  }
  if ("sql" in value && typeof value.sql === "string") acc.push(value.sql);
  if ("text" in value && typeof value.text === "string") acc.push(value.text);
  if ("strings" in value && Array.isArray(value.strings)) {
    acc.push(...value.strings.filter(Boolean));
  }
  if ("values" in value && Array.isArray(value.values)) {
    (value.values as readonly SqlChunk[]).forEach((entry) => collectSqlChunks(entry, acc));
  }
  return acc;
};

const collectSqlFromCall = (call: unknown[] | undefined): string =>
  (call ?? []).flatMap((entry) => collectSqlChunks(entry as SqlChunk)).join(" ");

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    $executeRaw: (...args: Prisma.Sql[]) => executeRawMock(...args),
  },
}));

describe("updateThreadStatsForRoots", () => {
  beforeEach(() => {
    executeRawMock.mockReset();
  });

  it("skips when there are no valid roots", async () => {
    await updateThreadStatsForRoots([null, undefined, Buffer.alloc(0)]);
    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("dedupes roots before updating", async () => {
    const root = Buffer.from("11".repeat(32), "hex");
    const other = Buffer.from("22".repeat(32), "hex");

    await updateThreadStatsForRoots([root, root, Buffer.alloc(0), other]);

    expect(executeRawMock).toHaveBeenCalledTimes(1);
  });

  it("counts mention-only or attachment-only replies as renderable thread activity", async () => {
    const root = Buffer.from("11".repeat(32), "hex");

    await updateThreadStatsForRoots([root]);

    const sqlText = collectSqlFromCall(executeRawMock.mock.calls[0]);
    expect(sqlText).toContain("mentioned_fids");
    expect(sqlText).toContain("embed_summaries");
    expect(sqlText).toContain("embeds_array");
  });
});
