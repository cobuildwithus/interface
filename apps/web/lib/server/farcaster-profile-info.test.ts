import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    farcasterProfile: {
      findUnique: vi.fn(),
    },
    $primary: vi.fn(),
  },
}));

const { getLinkedAccountsByAddress } = vi.hoisted(() => ({
  getLinkedAccountsByAddress: vi.fn(),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({ default: prismaMock }));
vi.mock("@/lib/domains/auth/linked-accounts/store", () => ({
  getLinkedAccountsByAddress,
}));

import type { LinkedAccountRecord } from "@/lib/domains/auth/linked-accounts/types";
import { getFarcasterProfileInfo } from "./farcaster-profile-info";
import type { Session } from "./session-types";

type SessionOverrides = Omit<Partial<Session>, "farcaster"> & {
  farcaster?: Partial<NonNullable<Session["farcaster"]>> | null;
};

const makeSession = (overrides: SessionOverrides = {}) =>
  ({ ...overrides }) as Partial<Session> as Session;

const makeLinkedAccount = (overrides: Partial<LinkedAccountRecord> = {}): LinkedAccountRecord => ({
  platform: "farcaster",
  platformId: "1",
  username: null,
  displayName: null,
  avatarUrl: null,
  source: "verified_address",
  canPost: false,
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

describe("getFarcasterProfileInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$primary.mockReturnValue(prismaMock);
  });

  it("returns session farcaster data when present", async () => {
    prismaMock.farcasterProfile.findUnique.mockResolvedValueOnce({
      fname: "stored",
      displayName: "Stored",
      avatarUrl: "https://stored",
    });

    const session = makeSession({
      address: "0xabc",
      farcaster: {
        fid: 12,
        username: "session",
        displayName: "Session",
        pfp: "https://pfp",
      },
    });

    const result = await getFarcasterProfileInfo(session);
    expect(result).toEqual({
      fid: 12,
      username: "stored",
      displayName: "Stored",
      pfp: "https://stored",
    });
  });

  it("derives fid and profile from linked accounts", async () => {
    getLinkedAccountsByAddress.mockResolvedValueOnce([
      makeLinkedAccount({
        platformId: "777",
        username: "linked",
        displayName: "Linked",
        avatarUrl: "https://linked",
        source: "neynar_signer",
        canPost: true,
      }),
    ]);
    prismaMock.farcasterProfile.findUnique.mockResolvedValueOnce(null);

    const session = makeSession({ address: "0xabc" });
    const result = await getFarcasterProfileInfo(session);

    expect(result).toEqual({
      fid: 777,
      username: "linked",
      displayName: "Linked",
      pfp: "https://linked",
    });
  });

  it("returns fid null when unavailable", async () => {
    const session = makeSession();
    const result = await getFarcasterProfileInfo(session);
    expect(result).toEqual({ fid: null });
  });

  it("returns fid null when no farcaster accounts are linked", async () => {
    getLinkedAccountsByAddress.mockResolvedValueOnce([makeLinkedAccount({ platform: "x" })]);
    const session = makeSession({ address: "0xabc" });
    const result = await getFarcasterProfileInfo(session);
    expect(result).toEqual({ fid: null });
  });

  it("returns fid null when linked farcaster account has invalid fid", async () => {
    getLinkedAccountsByAddress.mockResolvedValueOnce([
      makeLinkedAccount({
        platformId: "not-a-number",
        username: "linked",
        displayName: "Linked",
        avatarUrl: "https://linked",
      }),
    ]);
    const session = makeSession({ address: "0xabc" });
    const result = await getFarcasterProfileInfo(session);
    expect(result).toEqual({ fid: null });
  });

  it("prefers canPost accounts over others", async () => {
    getLinkedAccountsByAddress.mockResolvedValueOnce([
      makeLinkedAccount({ platformId: "1", username: "first" }),
      makeLinkedAccount({
        platformId: "2",
        username: "second",
        displayName: "Second",
        avatarUrl: "https://second",
        canPost: true,
      }),
    ]);
    prismaMock.farcasterProfile.findUnique.mockResolvedValueOnce(null);

    const session = makeSession({ address: "0xabc" });
    const result = await getFarcasterProfileInfo(session);

    expect(result.fid).toBe(2);
    if (result.fid === 2) {
      expect(result.username).toBe("second");
    }
  });

  it("uses provided linked accounts without fetching", async () => {
    prismaMock.farcasterProfile.findUnique.mockResolvedValueOnce(null);
    const session = makeSession({ address: "0xabc" });
    const result = await getFarcasterProfileInfo(session, {
      linkedAccounts: [
        makeLinkedAccount({
          platformId: "9",
          username: "provided",
          displayName: "Provided",
          avatarUrl: "https://provided",
        }),
      ],
    });

    expect(getLinkedAccountsByAddress).not.toHaveBeenCalled();
    expect(result).toEqual({
      fid: 9,
      username: "provided",
      displayName: "Provided",
      pfp: "https://provided",
    });
  });

  it("falls back to linked data when profile fields are null", async () => {
    getLinkedAccountsByAddress.mockResolvedValueOnce([
      makeLinkedAccount({
        platformId: "11",
        username: "fallback",
        displayName: "Fallback",
        avatarUrl: "https://fallback",
      }),
    ]);
    prismaMock.farcasterProfile.findUnique.mockResolvedValueOnce({
      fname: null,
      displayName: null,
      avatarUrl: null,
    });

    const session = makeSession({ address: "0xabc" });
    const result = await getFarcasterProfileInfo(session);

    expect(result).toEqual({
      fid: 11,
      username: "fallback",
      displayName: "Fallback",
      pfp: "https://fallback",
    });
  });

  it("uses primary client when requested", async () => {
    prismaMock.farcasterProfile.findUnique.mockResolvedValueOnce({
      fname: "primary",
      displayName: "Primary",
      avatarUrl: "https://primary",
    });

    const session = makeSession({
      address: "0xabc",
      farcaster: { fid: 5 },
    });

    const result = await getFarcasterProfileInfo(session, { usePrimary: true });

    expect(prismaMock.$primary).toHaveBeenCalledTimes(1);
    expect(result.fid).toBe(5);
    if (result.fid !== null) {
      expect(result.displayName).toBe("Primary");
    }
  });
});
