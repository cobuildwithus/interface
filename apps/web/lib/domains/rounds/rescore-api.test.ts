import { beforeEach, describe, expect, it, vi } from "vitest";

import { rescoreOpenRoundsForRule } from "./rescore-api";
import { fetchJsonWithTimeout } from "@/lib/integrations/http/fetch";
import prisma from "@/lib/server/db/cobuild-db-client";
import { revalidateTag } from "next/cache";

vi.mock("@/lib/integrations/http/fetch", () => ({
  fetchJsonWithTimeout: vi.fn(),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    round: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

const mockedFetchJsonWithTimeout = vi.mocked(fetchJsonWithTimeout);
const mockedFindMany = vi.mocked(prisma.round.findMany);
const mockedRevalidateTag = vi.mocked(revalidateTag);

const originalEnv = { ...process.env };

describe("rescoreOpenRoundsForRule", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  it("returns failed when API config is missing", async () => {
    delete process.env.CAST_RULES_API_URL;
    delete process.env.CAST_RULES_API_KEY;
    mockedFindMany.mockResolvedValue([{ id: BigInt(1) }] as never);

    const result = await rescoreOpenRoundsForRule(123);

    expect(result).toEqual({ rescored: [], failed: [1] });
    expect(mockedFetchJsonWithTimeout).not.toHaveBeenCalled();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("rescored rounds invalidate cache on success", async () => {
    process.env.CAST_RULES_API_URL = "https://api.example.com";
    process.env.CAST_RULES_API_KEY = "secret";
    mockedFindMany.mockResolvedValue([{ id: BigInt(5) }, { id: BigInt(6) }] as never);
    mockedFetchJsonWithTimeout
      .mockResolvedValueOnce({
        roundId: 5,
        duelCount: 2,
        castCount: 3,
        persistedRows: 3,
      })
      .mockResolvedValueOnce({
        roundId: 6,
        duelCount: 4,
        castCount: 5,
        persistedRows: 5,
      });

    const result = await rescoreOpenRoundsForRule(77);

    expect(result).toEqual({ rescored: [5, 6], failed: [] });
    expect(mockedFetchJsonWithTimeout).toHaveBeenCalledTimes(2);
    expect(mockedFetchJsonWithTimeout).toHaveBeenCalledWith(
      "https://api.example.com/v1/post-rounds/rescore",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-api-key": "secret" }),
        body: JSON.stringify({ roundId: 5 }),
      })
    );
    expect(mockedFetchJsonWithTimeout).toHaveBeenCalledWith(
      "https://api.example.com/v1/post-rounds/rescore",
      expect.objectContaining({
        body: JSON.stringify({ roundId: 6 }),
      })
    );
    expect(mockedRevalidateTag).toHaveBeenCalledWith("round:submissions:77", "seconds");
  });

  it("captures failures for individual rounds", async () => {
    process.env.CAST_RULES_API_URL = "https://api.example.com";
    process.env.CAST_RULES_API_KEY = "secret";
    mockedFindMany.mockResolvedValue([{ id: BigInt(8) }, { id: BigInt(9) }] as never);
    mockedFetchJsonWithTimeout
      .mockResolvedValueOnce({
        roundId: 8,
        duelCount: 1,
        castCount: 1,
        persistedRows: 1,
      })
      .mockRejectedValueOnce(new Error("boom"));

    const result = await rescoreOpenRoundsForRule(99);

    expect(result).toEqual({ rescored: [8], failed: [9] });
    expect(mockedRevalidateTag).toHaveBeenCalledWith("round:submissions:99", "seconds");
  });

  it("returns empty when no open rounds", async () => {
    mockedFindMany.mockResolvedValue([]);

    const result = await rescoreOpenRoundsForRule(12);

    expect(result).toEqual({ rescored: [], failed: [] });
    expect(mockedFetchJsonWithTimeout).not.toHaveBeenCalled();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });
});
