import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getLinkedAccountsResponseMock } = vi.hoisted(() => ({
  getLinkedAccountsResponseMock: vi.fn(),
}));
const { getFarcasterSignerStatusMock } = vi.hoisted(() => ({
  getFarcasterSignerStatusMock: vi.fn(),
}));
const { getFarcasterProfileInfoMock } = vi.hoisted(() => ({
  getFarcasterProfileInfoMock: vi.fn(),
}));
const { getProfileMock } = vi.hoisted(() => ({
  getProfileMock: vi.fn(),
}));

vi.mock("@/lib/server/linked-accounts-response", () => ({
  getLinkedAccountsResponse: (...args: Parameters<typeof getLinkedAccountsResponseMock>) =>
    getLinkedAccountsResponseMock(...args),
}));

vi.mock("@/lib/server/farcaster-signer-status", () => ({
  getFarcasterSignerStatus: (...args: Parameters<typeof getFarcasterSignerStatusMock>) =>
    getFarcasterSignerStatusMock(...args),
}));

vi.mock("@/lib/server/farcaster-profile-info", () => ({
  getFarcasterProfileInfo: (...args: Parameters<typeof getFarcasterProfileInfoMock>) =>
    getFarcasterProfileInfoMock(...args),
}));

vi.mock("@/lib/domains/profile/get-profile", () => ({
  getProfile: (...args: Parameters<typeof getProfileMock>) => getProfileMock(...args),
}));

import type { Profile } from "@/lib/domains/profile/types";
import type { FarcasterSignerStatus } from "@/lib/integrations/farcaster/signer-types";
import type { Session } from "@/lib/server/session-types";
import { loadSettingsSocialState } from "./social-state";

function makeSignerStatus(overrides: Partial<FarcasterSignerStatus> = {}): FarcasterSignerStatus {
  return {
    fid: null,
    hasSigner: false,
    signerPermissions: null,
    neynarPermissions: null,
    neynarStatus: null,
    neynarError: null,
    updatedAt: null,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    address: `0x${"a".repeat(40)}`,
    name: "Alice",
    avatar: null,
    bio: null,
    farcaster: {
      fid: null,
      name: null,
      avatar: null,
      bio: null,
      neynarUserScore: null,
    },
    url: "https://example.com/profile",
    ...overrides,
  };
}

describe("loadSettingsSocialState", () => {
  beforeEach(() => {
    getLinkedAccountsResponseMock.mockReset();
    getFarcasterSignerStatusMock.mockReset();
    getFarcasterProfileInfoMock.mockReset();
    getProfileMock.mockReset();
    getLinkedAccountsResponseMock.mockResolvedValue({ address: null, accounts: [] });
    getFarcasterSignerStatusMock.mockResolvedValue(makeSignerStatus());
    getFarcasterProfileInfoMock.mockResolvedValue({ fid: null });
    getProfileMock.mockResolvedValue(makeProfile());
  });

  it("preserves the server-side profile fallback when linked and session farcaster data are absent", async () => {
    const address = `0x${"b".repeat(40)}` as `0x${string}`;
    getLinkedAccountsResponseMock.mockResolvedValueOnce({ address, accounts: [] });
    getProfileMock.mockResolvedValueOnce(
      makeProfile({
        address,
        farcaster: {
          fid: 77,
          name: "profile_user",
          avatar: "https://example.com/profile.png",
          bio: null,
          neynarUserScore: null,
        },
      })
    );

    const session: Session = {
      address,
      farcaster: undefined,
      twitter: undefined,
    };
    const state = await loadSettingsSocialState({
      ...session,
    });

    expect(getProfileMock).toHaveBeenCalledWith(address);
    expect(state.farcasterAccount).toEqual({
      fid: 77,
      username: "profile_user",
      displayName: undefined,
      avatarUrl: "https://example.com/profile.png",
      source: "detected",
    });
  });

  it("seeds the signer identity key from the active auth identity", async () => {
    getFarcasterSignerStatusMock.mockResolvedValueOnce(makeSignerStatus({ fid: 88 }));

    const session: Session = {
      address: undefined,
      farcaster: {
        fid: 55,
        username: "session_user",
        displayName: "Session User",
        pfp: "https://example.com/session.png",
        source: "privy",
      },
      twitter: undefined,
    };
    const state = await loadSettingsSocialState(session);

    expect(getProfileMock).not.toHaveBeenCalled();
    expect(state.initialSignerIdentityKey).toBe("farcaster:88");
  });

  it("resolves profile fields from sources that match the preferred fid", async () => {
    const address = `0x${"c".repeat(40)}` as `0x${string}`;
    getLinkedAccountsResponseMock.mockResolvedValueOnce({
      address,
      accounts: [
        {
          platform: "farcaster",
          platformId: "11",
          username: "",
          displayName: "Linked Name",
          avatarUrl: "https://example.com/linked.png",
          source: "neynar_signer",
          canPost: true,
          updatedAt: "now",
        },
      ],
    });
    getFarcasterSignerStatusMock.mockResolvedValueOnce(makeSignerStatus({ fid: 11 }));
    getFarcasterProfileInfoMock.mockResolvedValueOnce({
      fid: 22,
      username: "wrong_fid",
      displayName: "Wrong FID",
      pfp: "https://example.com/wrong.png",
    });
    getProfileMock.mockResolvedValueOnce(
      makeProfile({
        address,
        farcaster: {
          fid: 33,
          name: "profile_fallback",
          avatar: "https://example.com/profile.png",
          bio: null,
          neynarUserScore: null,
        },
      })
    );

    const state = await loadSettingsSocialState({
      address,
      farcaster: {
        fid: 11,
        username: "session_match",
        displayName: "Session Match",
        pfp: "https://example.com/session.png",
        source: "privy",
      },
      twitter: undefined,
    });

    expect(state.resolvedProfile).toEqual({
      username: "session_match",
      displayName: "Linked Name",
      pfpUrl: "https://example.com/linked.png",
      hasFarcasterAccount: true,
    });
  });
});
