import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getLinkedAccountsServerView } = vi.hoisted(() => ({
  getLinkedAccountsServerView: vi.fn(),
}));

vi.mock("./linked-accounts-response", () => ({
  getLinkedAccountsServerView,
}));

import type { Session } from "./session-types";
import { getActiveFarcasterIdentity } from "./active-farcaster-identity";

describe("getActiveFarcasterIdentity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to the session farcaster identity when no preferred linked account exists", async () => {
    const session = {
      farcaster: {
        fid: 7,
        username: "session-user",
        displayName: "Session User",
        pfp: "https://example.com/session.png",
        source: "privy",
      },
    } as Session;

    const result = await getActiveFarcasterIdentity(session);

    expect(result).toEqual({
      fid: 7,
      username: "session-user",
      displayName: "Session User",
      pfp: "https://example.com/session.png",
    });
  });

  it("prefers a signer-capable linked farcaster account over the session fallback", async () => {
    getLinkedAccountsServerView.mockResolvedValueOnce({
      address: "0xabc",
      accounts: [
        {
          platform: "farcaster",
          platformId: "7",
          fid: 7,
          username: "session-user",
          displayName: "Session User",
          avatarUrl: "https://example.com/session.png",
          source: "verified_address",
          canPost: false,
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          platform: "farcaster",
          platformId: "42",
          fid: 42,
          username: "preferred-user",
          displayName: "Preferred User",
          avatarUrl: "https://example.com/preferred.png",
          source: "neynar_signer",
          canPost: true,
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    });

    const session = {
      address: `0x${"a".repeat(40)}`,
      farcaster: {
        fid: 7,
        username: "session-user",
        displayName: "Session User",
        pfp: "https://example.com/session.png",
        source: "privy",
      },
    } as Session;

    const result = await getActiveFarcasterIdentity(session, { usePrimary: true });

    expect(getLinkedAccountsServerView).toHaveBeenCalledWith(`0x${"a".repeat(40)}`, {
      usePrimary: true,
    });
    expect(result).toEqual({
      fid: 42,
      username: "preferred-user",
      displayName: "Preferred User",
      pfp: "https://example.com/preferred.png",
    });
  });

  it("does not promote verified-address session farcaster data into the active identity", async () => {
    const session = {
      farcaster: {
        fid: 9,
        username: "detected-user",
        displayName: "Detected User",
        pfp: "https://example.com/detected.png",
        source: "verified_address",
      },
    } as Session;

    const result = await getActiveFarcasterIdentity(session);

    expect(result).toEqual({
      fid: null,
      username: null,
      displayName: null,
      pfp: null,
    });
  });
});
