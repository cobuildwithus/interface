import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import type { MentionProfileInput } from "@/lib/integrations/farcaster/mentions";

vi.mock("server-only", () => ({}));

const queryRawMock = vi.fn();

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    $replica: () => ({
      $queryRaw: (...args: Prisma.Sql[]) => queryRawMock(...args),
    }),
  },
}));

type MockCastRow = {
  hash?: Buffer | null;
  fid?: bigint | number | null;
  authorFname?: string | null;
  authorDisplayName?: string | null;
  authorAvatarUrl?: string | null;
  authorNeynarScore?: number | null;
  text?: string | null;
  castTimestamp?: Date | null;
  embedsArray?: Prisma.JsonValue | null;
  mentionProfiles?: Array<MentionProfileInput | null> | null;
  mentionsPositions?: number[] | null;
};

vi.mock("@/lib/domains/rounds/cast-mappers", () => ({
  mapCastRowToFarcasterCast: (row: MockCastRow) => ({
    hash: row.hash ? `0x${Buffer.from(row.hash).toString("hex")}` : "0x0",
    author: {
      fid: Number(row.fid ?? 0),
      username: row.authorFname ?? null,
      display_name: row.authorDisplayName ?? null,
      pfp_url: row.authorAvatarUrl ?? null,
      neynar_score: row.authorNeynarScore ?? null,
    },
    text: row.text ?? "",
    timestamp: row.castTimestamp?.toISOString?.() ?? new Date(0).toISOString(),
    embeds: Array.isArray(row.embedsArray) ? row.embedsArray : [],
    mentioned_profiles: Array.isArray(row.mentionProfiles) ? row.mentionProfiles : null,
    mentions_positions: row.mentionsPositions ?? null,
  }),
}));

import {
  getThreadSlices,
  loadCobuildCastsByHashes,
  loadCobuildRootCastRow,
  loadCobuildThreadFocusIndex,
  loadCobuildThreadRepliesPage,
  loadCobuildThreadRows,
  mapThreadRows,
  mergeRootAuthorReplies,
} from "@/lib/integrations/farcaster/casts/thread/helpers";
import { REPLIES_WHERE_SQL } from "@/lib/integrations/farcaster/casts/thread/sql";

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

const baseRow = {
  text: "Hello",
  castTimestamp: new Date("2024-01-01T00:00:00Z"),
  embedsArray: [],
  embedSummaries: [],
  mentionsPositions: [],
  mentionProfiles: [],
  fid: 1n,
  authorFname: "alice",
  authorDisplayName: "Alice",
  authorAvatarUrl: null,
  authorNeynarScore: 1,
  aiOutputId: null,
  aiOutputModel: null,
  aiOutputOutput: null,
  aiOutputCreatedAt: null,
  evalShare: null,
  evalRank: null,
  evalWinRate: null,
  parentHash: null,
  viewCount: 0n,
  hiddenAt: null,
  hiddenReason: null,
};

describe("thread helpers", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  it("loads thread rows from replica", async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        ...baseRow,
        hash: Buffer.from("a".repeat(40), "hex"),
      },
    ]);

    const rows = await loadCobuildThreadRows(Buffer.from("a".repeat(40), "hex"));
    expect(rows).toHaveLength(1);
  });

  it("loads root cast row or returns null", async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        ...baseRow,
        hash: Buffer.from("a".repeat(40), "hex"),
      },
    ]);

    const root = await loadCobuildRootCastRow(Buffer.from("a".repeat(40), "hex"));
    expect(root?.hash).toBeDefined();

    queryRawMock.mockResolvedValueOnce([]);
    const missing = await loadCobuildRootCastRow(Buffer.from("b".repeat(40), "hex"));
    expect(missing).toBeNull();
  });

  it("loads replies page with count and rows", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 2n }]).mockResolvedValueOnce([
      {
        ...baseRow,
        hash: Buffer.from("b".repeat(40), "hex"),
        mergeTarget: Buffer.from("b".repeat(40), "hex"),
        isMerged: false,
      },
      {
        ...baseRow,
        hash: Buffer.from("c".repeat(40), "hex"),
        mergeTarget: Buffer.from("c".repeat(40), "hex"),
        isMerged: false,
      },
    ]);

    const result = await loadCobuildThreadRepliesPage(Buffer.from("a".repeat(40), "hex"), {
      limit: 10,
      offset: 0,
    });

    expect(result.replyCount).toBe(2);
    expect(result.rows).toHaveLength(2);
  });

  it("short-circuits replies page when empty", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 0n }]);

    const result = await loadCobuildThreadRepliesPage(Buffer.from("a".repeat(40), "hex"), {
      limit: 10,
      offset: 0,
    });

    expect(result.replyCount).toBe(0);
    expect(result.rows).toEqual([]);
  });

  it("short-circuits replies page when limit is zero", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 2n }]);

    const result = await loadCobuildThreadRepliesPage(Buffer.from("a".repeat(40), "hex"), {
      limit: 0,
      offset: 0,
    });

    expect(result.replyCount).toBe(2);
    expect(result.rows).toEqual([]);
  });

  it("uses recursive cte for reply counts", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 1n }]);

    await loadCobuildThreadRepliesPage(Buffer.from("a".repeat(40), "hex"), {
      limit: 0,
      offset: 0,
    });

    const sqlText = collectSqlChunks(queryRawMock.mock.calls[0]?.[0]).join(" ");

    expect(sqlText.toLowerCase()).toContain("with recursive");
  });

  it("excludes the root cast from replies", () => {
    const sqlText = collectSqlChunks(REPLIES_WHERE_SQL).join(" ");
    expect(sqlText).toContain("c.hash <> root.root_hash");
    expect(sqlText).toContain("c.root_parent_url");
  });

  it("loads focus index for a reply", async () => {
    queryRawMock.mockResolvedValueOnce([
      { mergeTarget: Buffer.from("b".repeat(40), "hex"), rowNumber: 3n },
    ]);

    const result = await loadCobuildThreadFocusIndex(
      Buffer.from("a".repeat(40), "hex"),
      Buffer.from("b".repeat(40), "hex")
    );

    expect(result.mergeTarget).toBeDefined();
    expect(result.index).toBe(2);
  });

  it("returns null index when rowNumber is missing", async () => {
    queryRawMock.mockResolvedValueOnce([
      { mergeTarget: Buffer.from("b".repeat(40), "hex"), rowNumber: null },
    ]);

    const result = await loadCobuildThreadFocusIndex(
      Buffer.from("a".repeat(40), "hex"),
      Buffer.from("b".repeat(40), "hex")
    );

    expect(result.mergeTarget).toBeDefined();
    expect(result.index).toBeNull();
  });

  it("returns null focus when missing", async () => {
    queryRawMock.mockResolvedValueOnce([]);

    const result = await loadCobuildThreadFocusIndex(
      Buffer.from("a".repeat(40), "hex"),
      Buffer.from("b".repeat(40), "hex")
    );

    expect(result.mergeTarget).toBeNull();
    expect(result.index).toBeNull();
  });

  it("loads casts by hashes", async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        ...baseRow,
        hash: Buffer.from("d".repeat(40), "hex"),
      },
    ]);

    const rows = await loadCobuildCastsByHashes([Buffer.from("d".repeat(40), "hex")]);
    expect(rows).toHaveLength(1);
  });

  it("returns empty casts for empty hashes", async () => {
    const rows = await loadCobuildCastsByHashes([]);
    expect(rows).toEqual([]);
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("merges root author replies in memory", async () => {
    const rootHash = Buffer.from("a".repeat(40), "hex");
    const replyHash = Buffer.from("b".repeat(40), "hex");
    const rows = [
      {
        ...baseRow,
        hash: rootHash,
        text: "Root",
        fid: 1n,
        parentHash: null,
      },
      {
        ...baseRow,
        hash: replyHash,
        text: "Reply",
        fid: 1n,
        parentHash: rootHash,
        castTimestamp: new Date("2024-01-01T00:00:02Z"),
      },
    ];

    const mapped = mapThreadRows(rows);
    const slices = getThreadSlices(mapped, `0x${"a".repeat(40)}`);
    expect(slices?.root).toBeDefined();
    expect(slices?.visibleReplies).toHaveLength(1);

    const result = mergeRootAuthorReplies(slices!.visibleReplies, slices!.root);
    expect(result.replies).toHaveLength(0);
    expect(slices!.root.text).toContain("Reply");
  });

  it("returns null slices when root is missing", () => {
    const mapped = mapThreadRows([
      {
        ...baseRow,
        hash: Buffer.from("a".repeat(40), "hex"),
        text: "Reply",
        parentHash: Buffer.from("b".repeat(40), "hex"),
      },
    ]);

    const slices = getThreadSlices(mapped, `0x${"b".repeat(40)}`);
    expect(slices).toBeNull();
  });

  it("does not merge replies from other authors", () => {
    const rootHash = Buffer.from("a".repeat(40), "hex");
    const rows = [
      {
        ...baseRow,
        hash: rootHash,
        text: "Root",
        fid: 1n,
        parentHash: null,
      },
      {
        ...baseRow,
        hash: Buffer.from("b".repeat(40), "hex"),
        text: "Other reply",
        fid: 2n,
        parentHash: rootHash,
        castTimestamp: new Date("2024-01-01T00:00:02Z"),
      },
    ];

    const mapped = mapThreadRows(rows);
    const slices = getThreadSlices(mapped, `0x${"a".repeat(40)}`);
    const result = mergeRootAuthorReplies(slices!.visibleReplies, slices!.root);
    expect(result.replies).toHaveLength(1);
    expect(slices!.root.text).toBe("Root");
  });

  it("returns empty merges for empty replies", () => {
    const root = mapThreadRows([
      {
        ...baseRow,
        hash: Buffer.from("a".repeat(40), "hex"),
        text: "Root",
      },
    ])[0];

    const result = mergeRootAuthorReplies([], root);
    expect(result.replies).toEqual([]);
  });
});
