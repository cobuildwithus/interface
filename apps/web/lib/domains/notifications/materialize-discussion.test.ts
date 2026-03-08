import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { queryRawMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    $primary: () => ({
      $queryRaw: (...args: Parameters<typeof queryRawMock>) => queryRawMock(...args),
    }),
  },
}));

import { materializeDiscussionNotifications } from "./materialize-discussion";

describe("materializeDiscussionNotifications", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  it("returns zero without querying when no hashes are provided", async () => {
    await expect(materializeDiscussionNotifications([])).resolves.toBe(0);
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("dedupes hashes before calling the DB function", async () => {
    const hash = Buffer.from("aa".repeat(20), "hex");
    const otherHash = Buffer.from("bb".repeat(20), "hex");
    queryRawMock.mockResolvedValueOnce([{ count: 2n }]);

    await expect(materializeDiscussionNotifications([hash, hash, null, otherHash])).resolves.toBe(
      2
    );

    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });
});
