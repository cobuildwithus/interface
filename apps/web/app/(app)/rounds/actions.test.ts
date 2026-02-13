import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockIsGlobalAdmin = vi.fn();
const mockFindRule = vi.fn();
const mockFindRound = vi.fn();
const mockCreateRound = vi.fn();
const mockCreateRule = vi.fn();
const mockUpdateRule = vi.fn();
const mockTransaction = vi.fn();
const mockRevalidateTag = vi.fn();
const mockGetFidsByUsernames = vi.fn();
type RoundResult = { id: bigint };

vi.mock("@/lib/domains/auth/session", () => ({
  getUser: () => mockGetUser(),
}));

vi.mock("@/lib/config/admins", () => ({
  isGlobalAdmin: (address: string | undefined) => mockIsGlobalAdmin(address),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    postFilterRule: {
      findUnique: (...args: Parameters<typeof mockFindRule>) => mockFindRule(...args),
      create: (...args: Parameters<typeof mockCreateRule>) => mockCreateRule(...args),
      update: (...args: Parameters<typeof mockUpdateRule>) => mockUpdateRule(...args),
    },
    round: {
      findUnique: (...args: Parameters<typeof mockFindRound>) => mockFindRound(...args),
      create: (...args: Parameters<typeof mockCreateRound>) => mockCreateRound(...args),
    },
    $transaction: (...args: Parameters<typeof mockTransaction>) => mockTransaction(...args),
  },
}));

vi.mock("next/cache", () => ({
  revalidateTag: (...args: Parameters<typeof mockRevalidateTag>) => mockRevalidateTag(...args),
}));

vi.mock("@/lib/integrations/farcaster/profile", () => ({
  getFidsByUsernames: (...args: Parameters<typeof mockGetFidsByUsernames>) =>
    mockGetFidsByUsernames(...args),
}));

describe("createRound", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetUser.mockResolvedValue("0x" + "a".repeat(40));
    mockIsGlobalAdmin.mockReturnValue(true);
    mockCreateRule.mockResolvedValue({ id: 42 });
    mockUpdateRule.mockResolvedValue({ id: 42 });
    mockCreateRound.mockResolvedValue({ id: BigInt(123) });
    mockGetFidsByUsernames.mockResolvedValue({ fids: [123], notFound: [] });
    type Tx = {
      postFilterRule: { create: typeof mockCreateRule; update: typeof mockUpdateRule };
      round: { create: typeof mockCreateRound };
    };
    const tx: Tx = {
      postFilterRule: { create: mockCreateRule, update: mockUpdateRule },
      round: { create: mockCreateRound },
    };
    mockTransaction.mockImplementation(async (fn: (tx: Tx) => Promise<RoundResult>) => fn(tx));
  });

  it("rejects unauthenticated users", async () => {
    mockGetUser.mockResolvedValue(undefined);
    const { createRound } = await import("./actions");
    await expect(
      createRound({
        title: "",
        description: "",
        prompt: "Prompt",
        requirementsText: "reqs",
        startAt: "2025-01-01",
        endAt: "2025-01-31",
      })
    ).resolves.toEqual({ ok: false, error: "Sign in to create rounds." });
  });

  it("rejects non-global admins", async () => {
    mockIsGlobalAdmin.mockReturnValue(false);
    const { createRound } = await import("./actions");
    const result = await createRound({
      title: "",
      description: "",
      prompt: "Prompt",
      requirementsText: "reqs",
      startAt: "2025-01-01",
      endAt: "2025-01-31",
    });
    expect(result.ok).toBe(false);
    expect(result).toEqual({
      ok: false,
      error: "You don't have permission to create rounds.",
    });
  });

  it("creates a round and revalidates rounds:list", async () => {
    const { createRound } = await import("./actions");
    const result = await createRound({
      title: "Test",
      description: "Short summary",
      prompt: "Which post is best?",
      castTemplate: "Template text",
      requirementsText: "Must be good",
      clauses: {
        farcaster: [{ type: "mentionsAll", usernames: ["dwr.eth"] }],
        x: [{ type: "mentionsAll", usernames: ["justcobuild"] }],
      },
      perUserLimit: 3,
      status: "open",
      variant: "ideas",
      startAt: "2025-01-01",
      endAt: "2025-01-31",
    });

    expect(result).toEqual({ ok: true, roundId: "123" });
    expect(mockGetFidsByUsernames).toHaveBeenCalledWith(["dwr.eth"]);
    expect(mockCreateRule).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Test",
          outputTag: expect.stringMatching(/^pending-rule-/),
          requirementsText: "Must be good",
          castTemplate: "Template text",
          perUserLimit: 3,
          platforms: ["farcaster", "x"],
          clauses: {
            farcaster: [{ type: "mentionsAll", fids: [123] }],
            x: [{ type: "mentionsAll", usernames: ["justcobuild"] }],
          },
        }),
      })
    );
    expect(mockUpdateRule).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { outputTag: "rule-42" },
    });
    expect(mockCreateRound).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Test",
          description: "Short summary",
          prompt: "Which post is best?",
          startAt: expect.any(Date),
          endAt: expect.any(Date),
          primaryRuleId: 42,
          createdByAddress: "0x" + "a".repeat(40),
          status: "open",
          variant: "ideas",
        }),
      })
    );
    expect(mockRevalidateTag).toHaveBeenCalledWith("rounds:list", "seconds");
  });

  it("rejects missing start date", async () => {
    const { createRound } = await import("./actions");
    const result = await createRound({
      title: "Test",
      description: "Short summary",
      prompt: "Which post is best?",
      requirementsText: "Must be good",
      startAt: "",
      endAt: "2025-01-31",
    });

    expect(result.ok).toBe(false);
    expect(result).toHaveProperty("error");
  });

  it("rejects missing end date", async () => {
    const { createRound } = await import("./actions");
    const result = await createRound({
      title: "Test",
      description: "Short summary",
      prompt: "Which post is best?",
      requirementsText: "Must be good",
      startAt: "2025-01-01",
      endAt: "",
    });

    expect(result.ok).toBe(false);
    expect(result).toHaveProperty("error");
  });

  it("accepts media variant", async () => {
    const { createRound } = await import("./actions");
    const result = await createRound({
      title: "Media Round",
      description: "Images only",
      prompt: "Pick the best meme",
      requirementsText: "Must include an image",
      variant: "media",
      startAt: "2025-01-01",
      endAt: "2025-01-31",
    });

    expect(result.ok).toBe(true);
    expect(mockCreateRound).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          variant: "media",
        }),
      })
    );
  });

  it("rejects duplicate clause types per platform", async () => {
    const { createRound } = await import("./actions");
    const result = await createRound({
      title: "Test",
      description: "Short summary",
      prompt: "Which post is best?",
      requirementsText: "Must be good",
      startAt: "2025-01-01",
      endAt: "2025-01-31",
      clauses: {
        farcaster: [
          { type: "mentionsAll", usernames: ["dwr.eth"] },
          { type: "mentionsAll", usernames: ["vitalik.eth"] },
        ],
        x: [],
      },
    });

    expect(result.ok).toBe(false);
    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.stringContaining("Duplicate clause type"),
      })
    );
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects unknown Farcaster usernames", async () => {
    mockGetFidsByUsernames.mockResolvedValue({ fids: [], notFound: ["unknown_user"] });
    const { createRound } = await import("./actions");
    const result = await createRound({
      title: "Test",
      description: "Short summary",
      prompt: "Which post is best?",
      requirementsText: "Must be good",
      startAt: "2025-01-01",
      endAt: "2025-01-31",
      clauses: {
        farcaster: [{ type: "mentionsAll", usernames: ["unknown_user"] }],
        x: [],
      },
    });

    expect(result.ok).toBe(false);
    expect(result).toEqual({
      ok: false,
      error: "Farcaster username not found: unknown_user",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
