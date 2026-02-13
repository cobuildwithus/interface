import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { findUnique, create, update } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    farcasterProfile: {
      findUnique,
      create,
      update,
    },
  },
}));

vi.mock("@/lib/integrations/farcaster/neynar-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/integrations/farcaster/neynar-client")>(
    "@/lib/integrations/farcaster/neynar-client"
  );
  return {
    ...actual,
    neynarFetchUsersByFids: vi.fn(),
  };
});

import { neynarFetchUsersByFids } from "@/lib/integrations/farcaster/neynar-client";
import { saveVerifiedAddressForFid } from "./save-verified-address";

describe("saveVerifiedAddressForFid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when address already verified", async () => {
    findUnique.mockResolvedValueOnce({
      verifiedAddresses: ["0xabc"],
      manualVerifiedAddresses: ["0xabc"],
    });

    await saveVerifiedAddressForFid(123, "0xAbc");

    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("updates existing profile with new address", async () => {
    findUnique.mockResolvedValueOnce({
      verifiedAddresses: ["0xabc"],
      manualVerifiedAddresses: [],
    });

    await saveVerifiedAddressForFid(123, "0xdef");

    expect(update).toHaveBeenCalledWith({
      where: { fid: BigInt(123) },
      data: expect.objectContaining({
        verifiedAddresses: ["0xabc", "0xdef"],
        manualVerifiedAddresses: ["0xdef"],
      }),
    });
  });

  it("creates profile when missing", async () => {
    findUnique.mockResolvedValueOnce(null);
    vi.mocked(neynarFetchUsersByFids).mockResolvedValueOnce([
      {
        fid: 123,
        username: "alice",
        display_name: "Alice",
        pfp_url: "https://example.com/pfp.png",
        experimental: { neynar_user_score: 0 },
      },
    ]);

    await saveVerifiedAddressForFid(123, "0xdef");

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fid: BigInt(123),
        fname: "alice",
        displayName: "Alice",
        avatarUrl: "https://example.com/pfp.png",
        verifiedAddresses: ["0xdef"],
        manualVerifiedAddresses: ["0xdef"],
        neynarUserScore: 0,
      }),
    });
  });

  it("creates profile when neynar user is missing", async () => {
    findUnique.mockResolvedValueOnce(null);
    vi.mocked(neynarFetchUsersByFids).mockResolvedValueOnce([]);

    await saveVerifiedAddressForFid(456, "0xdef");

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fid: BigInt(456),
        fname: null,
        displayName: null,
        avatarUrl: null,
        verifiedAddresses: ["0xdef"],
        manualVerifiedAddresses: ["0xdef"],
        neynarUserScore: null,
        neynarUserScoreUpdatedAt: null,
      }),
    });
  });

  it("handles missing manual verified addresses", async () => {
    findUnique.mockResolvedValueOnce({
      verifiedAddresses: [],
      manualVerifiedAddresses: undefined,
    });

    await saveVerifiedAddressForFid(789, "0xaaa");

    expect(update).toHaveBeenCalledWith({
      where: { fid: BigInt(789) },
      data: expect.objectContaining({
        verifiedAddresses: ["0xaaa"],
        manualVerifiedAddresses: ["0xaaa"],
      }),
    });
  });
});
