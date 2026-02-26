import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    farcasterProfile: {
      updateMany: vi.fn(),
    },
  },
}));

const {
  getSession,
  neynarUpdateUserProfile,
  getSignerRecord,
  getCachedNeynarSignerStatus,
  upsertLinkedAccount,
  revalidateTag,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  neynarUpdateUserProfile: vi.fn(),
  getSignerRecord: vi.fn(),
  getCachedNeynarSignerStatus: vi.fn(),
  upsertLinkedAccount: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({ default: prismaMock }));
vi.mock("@/lib/domains/auth/session", () => ({ getSession }));
vi.mock("@/lib/integrations/farcaster/neynar-client", () => ({ neynarUpdateUserProfile }));
vi.mock("@/lib/integrations/farcaster/signer-store", () => ({ getSignerRecord }));
vi.mock("@/lib/integrations/farcaster/signer-status", () => ({
  getCachedNeynarSignerStatus,
}));
vi.mock("@/lib/domains/auth/linked-accounts/store", () => ({ upsertLinkedAccount }));
vi.mock("next/cache", () => ({ revalidateTag }));

import { updateFarcasterProfile } from "./farcaster-profile-update";

describe("updateFarcasterProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires update payload", async () => {
    const result = await updateFarcasterProfile({});
    expect(result).toEqual({ ok: false, error: "Nothing to update.", status: 400 });
  });

  it("rejects empty display name", async () => {
    const result = await updateFarcasterProfile({ displayName: "  " });
    expect(result).toEqual({
      ok: false,
      error: "Display name cannot be empty.",
      status: 400,
    });
  });

  it("rejects empty profile photo url", async () => {
    const result = await updateFarcasterProfile({ pfpUrl: "  " });
    expect(result).toEqual({
      ok: false,
      error: "Profile photo URL cannot be empty.",
      status: 400,
    });
  });

  it("rejects invalid profile photo url", async () => {
    const result = await updateFarcasterProfile({ pfpUrl: "ftp://bad" });
    expect(result).toEqual({
      ok: false,
      error: "Profile photo URL must be http(s).",
      status: 400,
    });
  });

  it("rejects malformed profile photo url", async () => {
    const result = await updateFarcasterProfile({ pfpUrl: "http://" });
    expect(result).toEqual({
      ok: false,
      error: "Profile photo URL is invalid.",
      status: 400,
    });
  });

  it("requires wallet connection", async () => {
    getSession.mockResolvedValueOnce({ farcaster: { fid: 1 } });
    const result = await updateFarcasterProfile({ displayName: "Name" });
    expect(result).toEqual({
      ok: false,
      error: "Connect a wallet before updating profile.",
      status: 401,
    });
  });

  it("requires farcaster connection", async () => {
    getSession.mockResolvedValueOnce({ address: "0xabc" });
    const result = await updateFarcasterProfile({ displayName: "Name" });
    expect(result).toEqual({
      ok: false,
      error: "Connect a Farcaster account to update profile.",
      status: 401,
    });
  });

  it("requires signer record", async () => {
    getSession.mockResolvedValueOnce({ address: "0xabc", farcaster: { fid: 1 } });
    getSignerRecord.mockResolvedValueOnce(null);
    const result = await updateFarcasterProfile({ displayName: "Name" });
    expect(result).toEqual({
      ok: false,
      error: "Farcaster signer not connected.",
      status: 403,
    });
  });

  it("surfaces signer status errors", async () => {
    getSession.mockResolvedValueOnce({ address: "0xabc", farcaster: { fid: 1 } });
    getSignerRecord.mockResolvedValueOnce({ signerUuid: "uuid" });
    getCachedNeynarSignerStatus.mockResolvedValueOnce({
      ok: false,
      error: "neynar down",
      status: 503,
    });

    const result = await updateFarcasterProfile({ displayName: "Name" });
    expect(result).toEqual({ ok: false, error: "neynar down", status: 503 });
  });

  it("rejects when signer not approved", async () => {
    getSession.mockResolvedValueOnce({ address: "0xabc", farcaster: { fid: 1 } });
    getSignerRecord.mockResolvedValueOnce({ signerUuid: "uuid" });
    getCachedNeynarSignerStatus.mockResolvedValueOnce({
      ok: true,
      status: "pending",
      permissions: ["write_all"],
    });

    const result = await updateFarcasterProfile({ displayName: "Name" });
    expect(result).toEqual({
      ok: false,
      error: "Signer not approved (status=pending).",
      status: 403,
    });
  });

  it("requires update profile permission", async () => {
    getSession.mockResolvedValueOnce({ address: "0xabc", farcaster: { fid: 1 } });
    getSignerRecord.mockResolvedValueOnce({ signerUuid: "uuid", signerPermissions: [] });
    getCachedNeynarSignerStatus.mockResolvedValueOnce({ ok: true, status: "approved" });

    const result = await updateFarcasterProfile({ displayName: "Name" });
    expect(result).toEqual({
      ok: false,
      error: "Signer is missing profile update permission.",
      status: 403,
    });
  });

  it("returns update errors", async () => {
    getSession.mockResolvedValueOnce({ address: "0xabc", farcaster: { fid: 1, username: "user" } });
    getSignerRecord.mockResolvedValueOnce({ signerUuid: "uuid", signerPermissions: ["write_all"] });
    getCachedNeynarSignerStatus.mockResolvedValueOnce({ ok: true, status: "approved" });
    neynarUpdateUserProfile.mockResolvedValueOnce({ ok: false, error: "bad", status: 500 });

    const result = await updateFarcasterProfile({ displayName: "Name" });
    expect(result).toEqual({ ok: false, error: "bad", status: 500 });
  });

  it("updates profile on success", async () => {
    getSession.mockResolvedValueOnce({
      address: "0xabc",
      farcaster: { fid: 1, username: "user" },
    });
    getSignerRecord.mockResolvedValueOnce({ signerUuid: "uuid", signerPermissions: ["write_all"] });
    getCachedNeynarSignerStatus.mockResolvedValueOnce({
      ok: true,
      status: "approved",
      permissions: ["write_all"],
    });
    neynarUpdateUserProfile.mockResolvedValueOnce({ ok: true });

    const result = await updateFarcasterProfile({
      displayName: "New Name",
      pfpUrl: "https://example.com/avatar.png",
    });

    expect(upsertLinkedAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerAddress: "0xabc",
        platform: "farcaster",
        platformId: "1",
        displayName: "New Name",
        avatarUrl: "https://example.com/avatar.png",
      })
    );
    expect(prismaMock.farcasterProfile.updateMany).toHaveBeenCalled();
    expect(revalidateTag).toHaveBeenCalledWith("farcaster-profile", "default");
    expect(revalidateTag).toHaveBeenCalledWith("profile-v4", "default");
    expect(result).toEqual({
      ok: true,
      displayName: "New Name",
      pfpUrl: "https://example.com/avatar.png",
    });
  });

  it("uses signer record permissions when signer status has none", async () => {
    getSession.mockResolvedValueOnce({
      address: "0xabc",
      farcaster: { fid: 2, username: "user" },
    });
    getSignerRecord.mockResolvedValueOnce({
      signerUuid: "uuid-2",
      signerPermissions: ["update_profile"],
    });
    getCachedNeynarSignerStatus.mockResolvedValueOnce({ ok: true, status: "approved" });
    neynarUpdateUserProfile.mockResolvedValueOnce({ ok: true });

    const result = await updateFarcasterProfile({ displayName: "Solo Name" });

    expect(result).toEqual({ ok: true, displayName: "Solo Name" });
    expect(upsertLinkedAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerAddress: "0xabc",
        platformId: "2",
        displayName: "Solo Name",
      })
    );
  });
});
