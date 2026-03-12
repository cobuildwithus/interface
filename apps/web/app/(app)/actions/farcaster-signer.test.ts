import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));
const { deleteSignerRecordMock } = vi.hoisted(() => ({
  deleteSignerRecordMock: vi.fn(),
}));
const { getActiveFarcasterIdentityMock } = vi.hoisted(() => ({
  getActiveFarcasterIdentityMock: vi.fn(),
}));
const { clearLinkedAccountPostingAccessMock } = vi.hoisted(() => ({
  clearLinkedAccountPostingAccessMock: vi.fn(),
}));

vi.mock("@/lib/domains/auth/session", () => ({
  getSession: (...args: Parameters<typeof getSessionMock>) => getSessionMock(...args),
}));
vi.mock("@/lib/integrations/farcaster/signer-store", () => ({
  deleteSignerRecord: (...args: Parameters<typeof deleteSignerRecordMock>) =>
    deleteSignerRecordMock(...args),
}));
vi.mock("@/lib/server/active-farcaster-identity", () => ({
  getActiveFarcasterIdentity: (...args: Parameters<typeof getActiveFarcasterIdentityMock>) =>
    getActiveFarcasterIdentityMock(...args),
}));
vi.mock("@/lib/domains/auth/linked-accounts/store", () => ({
  clearLinkedAccountPostingAccess: (
    ...args: Parameters<typeof clearLinkedAccountPostingAccessMock>
  ) => clearLinkedAccountPostingAccessMock(...args),
}));

import { disconnectFarcasterSignerAction } from "./farcaster-signer";

describe("disconnectFarcasterSignerAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears signer capability on the linked farcaster account after disconnect", async () => {
    getSessionMock.mockResolvedValueOnce({
      address: `0x${"a".repeat(40)}`,
      farcaster: {
        fid: 42,
        source: "privy",
      },
    });
    getActiveFarcasterIdentityMock.mockResolvedValueOnce({
      fid: 42,
      username: "alice",
      displayName: "Alice",
      pfp: null,
    });

    const result = await disconnectFarcasterSignerAction();

    expect(deleteSignerRecordMock).toHaveBeenCalledWith(42);
    expect(clearLinkedAccountPostingAccessMock).toHaveBeenCalledWith({
      ownerAddress: `0x${"a".repeat(40)}`,
      platform: "farcaster",
      platformId: "42",
      source: "privy",
    });
    expect(result).toEqual({
      ok: true,
      status: {
        fid: 42,
        hasSigner: false,
        signerPermissions: null,
        neynarPermissions: null,
        neynarStatus: null,
        neynarError: null,
        updatedAt: null,
      },
    });
  });

  it("falls back to verified-address source when the session does not own the signer fid", async () => {
    getSessionMock.mockResolvedValueOnce({
      address: `0x${"b".repeat(40)}`,
      farcaster: {
        fid: 7,
        source: "verified_address",
      },
    });
    getActiveFarcasterIdentityMock.mockResolvedValueOnce({
      fid: 42,
      username: "alice",
      displayName: "Alice",
      pfp: null,
    });

    await disconnectFarcasterSignerAction();

    expect(clearLinkedAccountPostingAccessMock).toHaveBeenCalledWith({
      ownerAddress: `0x${"b".repeat(40)}`,
      platform: "farcaster",
      platformId: "42",
      source: "verified_address",
    });
  });
});
