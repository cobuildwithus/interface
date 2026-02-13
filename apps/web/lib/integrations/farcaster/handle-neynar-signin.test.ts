import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const {
  getSession,
  saveVerifiedAddressForFid,
  setSignerRecord,
  upsertLinkedAccount,
  revalidateTag,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  saveVerifiedAddressForFid: vi.fn(),
  setSignerRecord: vi.fn(),
  upsertLinkedAccount: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/domains/auth/session", () => ({ getSession }));
vi.mock("@/lib/integrations/farcaster/save-verified-address", () => ({
  saveVerifiedAddressForFid,
}));
vi.mock("@/lib/integrations/farcaster/signer-store", () => ({ setSignerRecord }));
vi.mock("@/lib/domains/auth/linked-accounts/store", () => ({ upsertLinkedAccount }));
vi.mock("next/cache", () => ({ revalidateTag }));

import { handleNeynarSignin } from "./handle-neynar-signin";

describe("handleNeynarSignin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when wallet missing", async () => {
    getSession.mockResolvedValueOnce({});
    await expect(
      handleNeynarSignin({
        fid: 123,
        signer_uuid: "8d13fd9c-1dd6-4e33-8f07-4a3cdd6e9b3b",
        signer_permissions: ["WRITE_ALL"],
      })
    ).rejects.toThrow("Connect a wallet");
  });

  it("rejects invalid fid", async () => {
    getSession.mockResolvedValueOnce({ address: "0xabc" });
    await expect(
      handleNeynarSignin({
        fid: "bad",
        signer_uuid: "8d13fd9c-1dd6-4e33-8f07-4a3cdd6e9b3b",
        signer_permissions: ["WRITE_ALL"],
      })
    ).rejects.toThrow("Invalid Farcaster ID");
  });

  it("rejects mismatched fid", async () => {
    getSession.mockResolvedValueOnce({ address: "0xabc", farcaster: { fid: 1 } });
    await expect(
      handleNeynarSignin({
        fid: 2,
        signer_uuid: "8d13fd9c-1dd6-4e33-8f07-4a3cdd6e9b3b",
        signer_permissions: ["WRITE_ALL"],
      })
    ).rejects.toThrow("does not match");
  });

  it("rejects invalid signer uuid", async () => {
    getSession.mockResolvedValueOnce({ address: "0xabc" });
    await expect(
      handleNeynarSignin({
        fid: 1,
        signer_uuid: "bad",
        signer_permissions: ["WRITE_ALL"],
      })
    ).rejects.toThrow("Invalid signer UUID");
  });

  it("rejects invalid signer permissions", async () => {
    getSession.mockResolvedValueOnce({ address: "0xabc" });
    await expect(
      handleNeynarSignin({
        fid: 1,
        signer_uuid: "8d13fd9c-1dd6-4e33-8f07-4a3cdd6e9b3b",
        signer_permissions: [],
      })
    ).rejects.toThrow("Invalid signer permissions");
  });

  it("stores signer and verified address on success", async () => {
    getSession.mockResolvedValueOnce({ address: "0xabc", farcaster: { fid: 1 } });
    const signerUuid = "8d13fd9c-1dd6-4e33-8f07-4a3cdd6e9b3b";

    await handleNeynarSignin({
      fid: 1,
      signer_uuid: signerUuid,
      signer_permissions: ["WRITE_ALL", "WRITE_ALL"],
    });

    expect(setSignerRecord).toHaveBeenCalledWith({
      fid: 1,
      signerUuid,
      signerPermissions: ["write_all"],
    });
    expect(upsertLinkedAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerAddress: "0xabc",
        platform: "farcaster",
        platformId: "1",
        source: "neynar_signer",
        canPost: true,
      })
    );
    expect(saveVerifiedAddressForFid).toHaveBeenCalledWith(1, "0xabc");
    expect(revalidateTag).toHaveBeenCalledWith("farcaster-profile", "default");
    expect(revalidateTag).toHaveBeenCalledWith("neynar-signer:1", "default");
    expect(revalidateTag).toHaveBeenCalledWith(`neynar-signer:uuid:${signerUuid}`, "default");
  });
});
