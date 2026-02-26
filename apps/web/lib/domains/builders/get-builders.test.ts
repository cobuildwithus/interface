import { describe, it, expect, vi, beforeEach } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";

vi.mock("server-only", () => ({}));

const mockGetEnsAddress = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/domains/token/onchain/clients", () => ({
  getClient: () => ({
    getEnsAddress: mockGetEnsAddress,
  }),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    roundSubmission: {
      findMany: (...args: Parameters<typeof mockFindMany>) => mockFindMany(...args),
    },
  },
}));

const passthroughCache: typeof unstableCache = (fn, _keyParts, _options) => fn;
vi.mock("next/cache", () => ({
  unstable_cache: passthroughCache,
}));

describe("get-builders", () => {
  beforeEach(() => {
    mockGetEnsAddress.mockReset();
    mockFindMany.mockReset();
  });

  it("returns founders first then submission addresses", async () => {
    mockGetEnsAddress
      .mockResolvedValueOnce("0x1111111111111111111111111111111111111111")
      .mockResolvedValueOnce("0x2222222222222222222222222222222222222222");
    mockFindMany.mockResolvedValue([
      { metadata: { beneficiaryAddress: "0x3333333333333333333333333333333333333333" } },
    ]);

    const { getBuilders } = await import("./get-builders");
    const page = await getBuilders();

    expect(page.items).toHaveLength(3);
    expect(page.items[0]).toEqual({
      address: "0x1111111111111111111111111111111111111111",
      isFounder: true,
    });
    expect(page.items[1]).toEqual({
      address: "0x2222222222222222222222222222222222222222",
      isFounder: true,
    });
    expect(page.items[2]).toEqual({
      address: "0x3333333333333333333333333333333333333333",
      isFounder: false,
    });
    expect(page.hasMore).toBe(false);
  }, 15000);

  it("handles ENS resolution failures gracefully", async () => {
    mockGetEnsAddress.mockRejectedValue(new Error("ENS error"));
    mockFindMany.mockResolvedValue([
      { metadata: { beneficiaryAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } },
    ]);

    const { getBuilders } = await import("./get-builders");
    const page = await getBuilders();

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.isFounder).toBe(false);
  });

  it("excludes founders from submission list to avoid duplicates", async () => {
    const founderAddress = "0x1111111111111111111111111111111111111111";
    mockGetEnsAddress
      .mockResolvedValueOnce(founderAddress)
      .mockResolvedValueOnce("0x2222222222222222222222222222222222222222");
    mockFindMany.mockResolvedValue([
      { metadata: { beneficiaryAddress: founderAddress } },
      { metadata: { beneficiaryAddress: "0x3333333333333333333333333333333333333333" } },
    ]);

    const { getBuilders } = await import("./get-builders");
    const page = await getBuilders();

    // Should have 2 founders + 1 non-founder (excluding the duplicate)
    expect(page.items).toHaveLength(3);
    expect(page.items.filter((i) => i.isFounder)).toHaveLength(2);
    expect(page.items.filter((i) => !i.isFounder)).toHaveLength(1);
  });

  it("handles empty submissions", async () => {
    mockGetEnsAddress.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([]);

    const { getBuilders } = await import("./get-builders");
    const page = await getBuilders();

    expect(page.items).toEqual([]);
    expect(page.hasMore).toBe(false);
  });

  it("filters out invalid addresses from metadata", async () => {
    mockGetEnsAddress.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([
      { metadata: null },
      { metadata: { beneficiaryAddress: "invalid" } },
      { metadata: { beneficiaryAddress: "0x" } },
      { metadata: { beneficiaryAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } },
    ]);

    const { getBuilders } = await import("./get-builders");
    const page = await getBuilders();

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.address).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  });

  it("paginates correctly", async () => {
    mockGetEnsAddress.mockResolvedValue(null);
    const manySubmissions = Array.from({ length: 30 }, (_, i) => ({
      metadata: { beneficiaryAddress: `0x${String(i).padStart(40, "0")}` },
    }));
    mockFindMany.mockResolvedValue(manySubmissions);

    const { getBuilders, BUILDERS_PAGE_SIZE } = await import("./get-builders");
    const page = await getBuilders(BUILDERS_PAGE_SIZE, 0);

    expect(page.items.length).toBe(BUILDERS_PAGE_SIZE);
    expect(page.hasMore).toBe(true);
  });
});
