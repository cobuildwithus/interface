import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getSignerRecord, setSignerRecord } = vi.hoisted(() => ({
  getSignerRecord: vi.fn(),
  setSignerRecord: vi.fn(),
}));

const { getCachedNeynarSignerStatus } = vi.hoisted(() => ({
  getCachedNeynarSignerStatus: vi.fn(),
}));

vi.mock("@/lib/integrations/farcaster/signer-store", () => ({
  getSignerRecord,
  setSignerRecord,
}));

vi.mock("@/lib/integrations/farcaster/signer-status", () => ({
  getCachedNeynarSignerStatus,
}));

import type { Session } from "./session-types";
import { getFarcasterSignerStatus } from "./farcaster-signer-status";

describe("getFarcasterSignerStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty status when fid missing", async () => {
    const session = {} as Session;
    const result = await getFarcasterSignerStatus(session);

    expect(result).toEqual({
      fid: null,
      hasSigner: false,
      signerPermissions: null,
      neynarPermissions: null,
      neynarStatus: null,
      neynarError: null,
      updatedAt: null,
    });
  });

  it("returns signer info without backfill when permissions already exist", async () => {
    getSignerRecord.mockResolvedValueOnce({
      fid: 222,
      signerUuid: "uuid-222",
      signerPermissions: ["cast"],
      updatedAt: "2025-01-02T00:00:00.000Z",
    });
    getCachedNeynarSignerStatus.mockResolvedValueOnce({
      ok: true,
      permissions: ["cast"],
      status: "approved",
    });

    const session = { farcaster: { fid: 222 } } as Session;
    const result = await getFarcasterSignerStatus(session);

    expect(result).toMatchObject({
      fid: 222,
      hasSigner: true,
      signerPermissions: ["cast"],
      neynarPermissions: ["cast"],
      neynarStatus: "approved",
      neynarError: null,
      updatedAt: "2025-01-02T00:00:00.000Z",
    });
    expect(setSignerRecord).not.toHaveBeenCalled();
  });

  it("captures neynar errors", async () => {
    getSignerRecord.mockResolvedValueOnce({
      fid: 333,
      signerUuid: "uuid-333",
      signerPermissions: [],
      updatedAt: null,
    });
    getCachedNeynarSignerStatus.mockResolvedValueOnce({
      ok: false,
      error: "neynar error",
    });

    const session = { farcaster: { fid: 333 } } as Session;
    const result = await getFarcasterSignerStatus(session);

    expect(result.neynarError).toBe("neynar error");
    expect(result.neynarPermissions).toBeNull();
    expect(setSignerRecord).not.toHaveBeenCalled();
  });

  it("backfills permissions when signerPermissions is missing", async () => {
    getSignerRecord.mockResolvedValueOnce({
      fid: 123,
      signerUuid: "uuid-123",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });
    getCachedNeynarSignerStatus.mockResolvedValueOnce({
      ok: true,
      permissions: ["cast"],
      status: "approved",
    });

    const session = { farcaster: { fid: 123 } } as Session;
    const result = await getFarcasterSignerStatus(session);

    expect(getCachedNeynarSignerStatus).toHaveBeenCalledWith("uuid-123", 123);
    expect(setSignerRecord).toHaveBeenCalledWith({
      fid: 123,
      signerUuid: "uuid-123",
      signerPermissions: ["cast"],
    });
    expect(result.signerPermissions).toBeNull();
  });
});
