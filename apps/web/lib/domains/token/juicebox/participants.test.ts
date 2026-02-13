import { describe, it, expect, vi, beforeEach } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";
import { base } from "viem/chains";
import { COBUILD_JUICEBOX_PROJECT_ID } from "@/lib/domains/token/juicebox/constants";

vi.mock("server-only", () => ({}));

const mockFindUniqueOrThrow = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    juiceboxProject: {
      findUniqueOrThrow: (...args: Parameters<typeof mockFindUniqueOrThrow>) =>
        mockFindUniqueOrThrow(...args),
    },
    juiceboxParticipant: {
      findMany: (...args: Parameters<typeof mockFindMany>) => mockFindMany(...args),
    },
  },
}));

const passthroughCache: typeof unstableCache = (fn, _keyParts, _options) => fn;
vi.mock("next/cache", () => ({
  unstable_cache: passthroughCache,
}));

describe("participants", () => {
  beforeEach(() => {
    mockFindUniqueOrThrow.mockReset();
    mockFindMany.mockReset();
  });

  it("fetches participants with correct params (default sort: new)", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ suckerGroupId: "group-1", erc20Symbol: "BUILD" });
    mockFindMany.mockResolvedValue([
      {
        address: "0x1234567890123456789012345678901234567890",
        balance: 1000000000000000000n,
        createdAt: 1704067200,
        firstOwned: 1704067200,
      },
    ]);

    const { getParticipants, PARTICIPANTS_PAGE_SIZE } = await import("./participants");
    const page = await getParticipants();

    expect(mockFindUniqueOrThrow).toHaveBeenCalledWith({
      where: { chainId_projectId: { chainId: base.id, projectId: COBUILD_JUICEBOX_PROJECT_ID } },
      select: {
        suckerGroupId: true,
        accountingToken: true,
        accountingTokenSymbol: true,
        accountingDecimals: true,
        erc20Symbol: true,
        erc20: true,
      },
    });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        suckerGroupId: "group-1",
        balance: { gt: 0 },
      },
      select: {
        address: true,
        balance: true,
        createdAt: true,
        firstOwned: true,
      },
      orderBy: { firstOwned: "desc" },
      take: PARTICIPANTS_PAGE_SIZE + 1,
      skip: 0,
    });
    expect(page).toEqual({
      items: [
        {
          address: "0x1234567890123456789012345678901234567890",
          balance: "1000000000000000000",
          createdAt: 1704067200,
          firstOwned: 1704067200,
        },
      ],
      hasMore: false,
      tokenSymbol: "BUILD",
    });
  });

  it("sorts by balance when sort is top", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ suckerGroupId: "group-1", erc20Symbol: "BUILD" });
    mockFindMany.mockResolvedValue([]);

    const { getParticipants, PARTICIPANTS_PAGE_SIZE } = await import("./participants");
    await getParticipants(PARTICIPANTS_PAGE_SIZE, 0, "top");

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { balance: "desc" },
      })
    );
  });

  it("returns empty page when no suckerGroupId", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ suckerGroupId: null, erc20Symbol: "BUILD" });

    const { getParticipants } = await import("./participants");
    const page = await getParticipants();

    expect(page).toEqual({ items: [], hasMore: false, tokenSymbol: "BUILD" });
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("handles Decimal-like objects", async () => {
    class FakeDecimal {
      private value: string;
      constructor(value: string) {
        this.value = value;
      }
      toString() {
        return this.value;
      }
    }

    mockFindUniqueOrThrow.mockResolvedValue({ suckerGroupId: "group-2", erc20Symbol: "TEST" });
    mockFindMany.mockResolvedValue([
      {
        address: "0x0000000000000000000000000000000000000000",
        balance: new FakeDecimal("5000000000000000000"),
        createdAt: 1704067201,
        firstOwned: 1704067201,
      },
    ]);

    const { getParticipants } = await import("./participants");
    const page = await getParticipants();

    expect(page.items[0]?.balance).toBe("5000000000000000000");
    expect(page.tokenSymbol).toBe("TEST");
  });

  it("handles numeric balance", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ suckerGroupId: "group-3", erc20Symbol: null });
    mockFindMany.mockResolvedValue([
      {
        address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        balance: 12345,
        createdAt: 1704067202,
        firstOwned: null,
      },
    ]);

    const { getParticipants } = await import("./participants");
    const page = await getParticipants();

    expect(page.items[0]?.balance).toBe("12345");
    expect(page.items[0]?.firstOwned).toBeNull();
    expect(page.tokenSymbol).toBeNull();
  });

  it("detects hasMore when results exceed limit", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ suckerGroupId: "group-4", erc20Symbol: "BUILD" });

    const { getParticipants, PARTICIPANTS_PAGE_SIZE } = await import("./participants");

    const manyResults = Array.from({ length: PARTICIPANTS_PAGE_SIZE + 1 }, (_, i) => ({
      address: `0x${String(i).padStart(40, "0")}`,
      balance: 1000n,
      createdAt: 1704067200,
      firstOwned: 1704067200,
    }));
    mockFindMany.mockResolvedValue(manyResults);

    const page = await getParticipants();

    expect(page.hasMore).toBe(true);
    expect(page.items.length).toBe(PARTICIPANTS_PAGE_SIZE);
  });

  it("passes offset for pagination", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({ suckerGroupId: "group-5", erc20Symbol: "BUILD" });
    mockFindMany.mockResolvedValue([]);

    const { getParticipants, PARTICIPANTS_PAGE_SIZE } = await import("./participants");
    await getParticipants(PARTICIPANTS_PAGE_SIZE, 24);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 24,
        take: PARTICIPANTS_PAGE_SIZE + 1,
      })
    );
  });
});
