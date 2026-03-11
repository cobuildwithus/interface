import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { findUnique, create, update } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

const { materializeDiscussionNotificationsForProfileFids } = vi.hoisted(() => ({
  materializeDiscussionNotificationsForProfileFids: vi.fn(),
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

vi.mock("@/lib/domains/notifications/materialize-discussion", () => ({
  materializeDiscussionNotificationsForProfileFids: (...args: unknown[]) =>
    materializeDiscussionNotificationsForProfileFids(...args),
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
import { persistFarcasterWalletLink } from "./persist-wallet-link";

describe("persistFarcasterWalletLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("skips when verified and manual arrays already contain the address", async () => {
    findUnique.mockResolvedValueOnce({
      verifiedAddresses: ["0xabc"],
      manualVerifiedAddresses: ["0xabc"],
    });

    await persistFarcasterWalletLink(123, "0xAbc");

    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(materializeDiscussionNotificationsForProfileFids).not.toHaveBeenCalled();
  });

  it("backfills the manual array when the address is already verified", async () => {
    findUnique.mockResolvedValueOnce({
      verifiedAddresses: ["0xabc"],
      manualVerifiedAddresses: [],
    });

    await persistFarcasterWalletLink(123, "0xAbc");

    expect(update).toHaveBeenCalledWith({
      where: { fid: BigInt(123) },
      data: expect.objectContaining({
        verifiedAddresses: ["0xabc"],
        manualVerifiedAddresses: ["0xabc"],
      }),
    });
    expect(materializeDiscussionNotificationsForProfileFids).not.toHaveBeenCalled();
  });

  it("merges existing manual addresses back into verified addresses", async () => {
    materializeDiscussionNotificationsForProfileFids.mockResolvedValueOnce(1);
    findUnique.mockResolvedValueOnce({
      verifiedAddresses: ["0xabc"],
      manualVerifiedAddresses: ["0xdef"],
    });

    await persistFarcasterWalletLink(123, "0xabc");

    expect(update).toHaveBeenCalledWith({
      where: { fid: BigInt(123) },
      data: expect.objectContaining({
        verifiedAddresses: ["0xabc", "0xdef"],
        manualVerifiedAddresses: ["0xdef", "0xabc"],
      }),
    });
    expect(materializeDiscussionNotificationsForProfileFids).toHaveBeenCalledWith([123]);
  });

  it("updates existing profile with a new address", async () => {
    materializeDiscussionNotificationsForProfileFids.mockResolvedValueOnce(1);
    findUnique.mockResolvedValueOnce({
      verifiedAddresses: ["0xabc"],
      manualVerifiedAddresses: [],
    });

    await persistFarcasterWalletLink(123, "0xdef");

    expect(update).toHaveBeenCalledWith({
      where: { fid: BigInt(123) },
      data: expect.objectContaining({
        verifiedAddresses: ["0xabc", "0xdef"],
        manualVerifiedAddresses: ["0xdef"],
      }),
    });
    expect(materializeDiscussionNotificationsForProfileFids).toHaveBeenCalledWith([123]);
  });

  it("creates profile when missing", async () => {
    materializeDiscussionNotificationsForProfileFids.mockResolvedValueOnce(1);
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

    await persistFarcasterWalletLink(123, "0xdef");

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
    expect(materializeDiscussionNotificationsForProfileFids).toHaveBeenCalledWith([123]);
  });

  it("creates missing profile with manual and Neynar verified addresses", async () => {
    materializeDiscussionNotificationsForProfileFids.mockResolvedValueOnce(2);
    findUnique.mockResolvedValueOnce(null);
    vi.mocked(neynarFetchUsersByFids).mockResolvedValueOnce([
      {
        fid: 123,
        username: "alice",
        display_name: "Alice",
        pfp_url: "https://example.com/pfp.png",
        custody_address: "0x999",
        verified_addresses: {
          primary: { eth_address: "0xAbC" },
          eth_addresses: ["0x456", "0xabc", "0x999"],
        },
        experimental: { neynar_user_score: 0.4 },
      },
    ]);

    await persistFarcasterWalletLink(123, "0xdef");

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        verifiedAddresses: ["0xdef", "0xabc", "0x456"],
        manualVerifiedAddresses: ["0xdef"],
      }),
    });
    expect(materializeDiscussionNotificationsForProfileFids).toHaveBeenCalledWith([123]);
  });

  it("creates profile when Neynar user is missing", async () => {
    materializeDiscussionNotificationsForProfileFids.mockResolvedValueOnce(1);
    findUnique.mockResolvedValueOnce(null);
    vi.mocked(neynarFetchUsersByFids).mockResolvedValueOnce([]);

    await persistFarcasterWalletLink(456, "0xdef");

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
    expect(materializeDiscussionNotificationsForProfileFids).toHaveBeenCalledWith([456]);
  });

  it("handles missing manual verified addresses", async () => {
    materializeDiscussionNotificationsForProfileFids.mockResolvedValueOnce(1);
    findUnique.mockResolvedValueOnce({
      verifiedAddresses: [],
      manualVerifiedAddresses: undefined,
    });

    await persistFarcasterWalletLink(789, "0xaaa");

    expect(update).toHaveBeenCalledWith({
      where: { fid: BigInt(789) },
      data: expect.objectContaining({
        verifiedAddresses: ["0xaaa"],
        manualVerifiedAddresses: ["0xaaa"],
      }),
    });
    expect(materializeDiscussionNotificationsForProfileFids).toHaveBeenCalledWith([789]);
  });

  it("warns without failing when rematerialization errors after the profile write", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    findUnique.mockResolvedValueOnce({
      verifiedAddresses: ["0xabc"],
      manualVerifiedAddresses: [],
    });
    materializeDiscussionNotificationsForProfileFids.mockRejectedValueOnce(new Error("boom"));

    await expect(persistFarcasterWalletLink(123, "0xdef")).resolves.toBeUndefined();

    expect(update).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledWith(
      "[farcaster] discussion notification rematerialization failed:",
      expect.any(Error)
    );
  });
});
