import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type Tx = {
  userDisallowedTokenCategory: {
    deleteMany: (...args: object[]) => Promise<void> | void;
    createMany: (...args: object[]) => Promise<void> | void;
  };
};

const { prismaMock, txMock } = vi.hoisted(() => {
  const tx: Tx = {
    userDisallowedTokenCategory: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  };
  return {
    txMock: tx,
    prismaMock: {
      userDisallowedTokenCategory: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: Tx) => Promise<void>) => cb(tx)),
    },
  };
});

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: prismaMock,
}));

import {
  getTokenCategoryPreferencesForAddress,
  updateTokenCategoryPreferencesForAddress,
} from "./token-category-preferences";

const allCategories = ["zora", "juicebox", "clanker", "erc20", "cobuild"] as const;

describe("token-category-preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated reads", async () => {
    const result = await getTokenCategoryPreferencesForAddress(null);
    expect(result).toEqual({ ok: false, status: 401, error: "Unauthorized" });
  });

  it("returns stored categories", async () => {
    prismaMock.userDisallowedTokenCategory.findMany.mockResolvedValueOnce([
      { category: "erc20" },
      { category: "zora" },
    ]);

    const result = await getTokenCategoryPreferencesForAddress("0xabc");
    expect(result).toEqual({
      ok: true,
      data: { disallowedCategories: ["erc20", "zora"] },
    });
  });

  it("handles storage errors", async () => {
    prismaMock.userDisallowedTokenCategory.findMany.mockRejectedValueOnce(new Error("boom"));
    const result = await getTokenCategoryPreferencesForAddress("0xabc");
    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Unable to load coin filters.",
    });
  });

  it("rejects unauthenticated updates", async () => {
    const result = await updateTokenCategoryPreferencesForAddress(null, {});
    expect(result).toEqual({ ok: false, status: 401, error: "Unauthorized" });
  });

  it("rejects invalid request body", async () => {
    const result = await updateTokenCategoryPreferencesForAddress("0xabc", "bad");
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Invalid request body",
    });
  });

  it("rejects non-array payloads", async () => {
    const result = await updateTokenCategoryPreferencesForAddress("0xabc", {
      disallowedCategories: "nope",
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "disallowedCategories must be an array",
    });
  });

  it("rejects unknown categories", async () => {
    const result = await updateTokenCategoryPreferencesForAddress("0xabc", {
      disallowedCategories: ["bad"],
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Unknown category: bad",
    });
  });

  it("rejects when all categories are disallowed", async () => {
    const result = await updateTokenCategoryPreferencesForAddress("0xabc", {
      disallowedCategories: [...allCategories],
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "At least one category must remain allowed",
    });
  });

  it("clears categories when none provided", async () => {
    const result = await updateTokenCategoryPreferencesForAddress("0xabc", {
      disallowedCategories: [],
    });

    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(txMock.userDisallowedTokenCategory.deleteMany).toHaveBeenCalledWith({
      where: { ownerAddress: "0xabc" },
    });
    expect(txMock.userDisallowedTokenCategory.createMany).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, data: { disallowedCategories: [] } });
  });

  it("stores unique, valid categories", async () => {
    const result = await updateTokenCategoryPreferencesForAddress("0xabc", {
      disallowedCategories: ["zora", "zora", "erc20"],
    });

    expect(txMock.userDisallowedTokenCategory.deleteMany).toHaveBeenCalledWith({
      where: { ownerAddress: "0xabc" },
    });
    expect(txMock.userDisallowedTokenCategory.createMany).toHaveBeenCalledWith({
      data: [
        { ownerAddress: "0xabc", category: "zora" },
        { ownerAddress: "0xabc", category: "erc20" },
      ],
      skipDuplicates: true,
    });
    expect(result).toEqual({
      ok: true,
      data: { disallowedCategories: ["zora", "erc20"] },
    });
  });
});
