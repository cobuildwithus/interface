import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

import { updateThreadStatsForRoots } from "./thread-stats";

const executeRawMock = vi.fn();

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
});
