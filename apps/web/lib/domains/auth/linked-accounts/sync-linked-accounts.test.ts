import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPrivyLinkedIdentity, upsertLinkedAccount } = vi.hoisted(() => ({
  getPrivyLinkedIdentity: vi.fn(),
  upsertLinkedAccount: vi.fn(),
}));

vi.mock("@/lib/domains/auth/session", () => ({ getPrivyLinkedIdentity }));
vi.mock("@/lib/domains/auth/linked-accounts/store", () => ({ upsertLinkedAccount }));

import { syncLinkedAccountsFromSession } from "./sync-linked-accounts";

describe("syncLinkedAccountsFromSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns missing_session when no privy data", async () => {
    getPrivyLinkedIdentity.mockResolvedValueOnce(undefined);

    const result = await syncLinkedAccountsFromSession();

    expect(result).toEqual({ ok: false, reason: "missing_session" });
    expect(upsertLinkedAccount).not.toHaveBeenCalled();
  });

  it("returns missing_address when wallet is absent", async () => {
    getPrivyLinkedIdentity.mockResolvedValueOnce({
      farcaster: { fid: 1, username: "alice" },
    });

    const result = await syncLinkedAccountsFromSession();

    expect(result).toEqual({ ok: false, reason: "missing_address" });
    expect(upsertLinkedAccount).not.toHaveBeenCalled();
  });

  it("upserts farcaster and twitter accounts", async () => {
    getPrivyLinkedIdentity.mockResolvedValueOnce({
      wallet: { address: "0x" + "a".repeat(40) },
      farcaster: { fid: 1, username: "alice" },
      twitter: { username: "alice_x", subject: "123" },
    });

    const result = await syncLinkedAccountsFromSession();

    expect(result).toEqual({ ok: true, updated: 2 });
    expect(upsertLinkedAccount).toHaveBeenCalledTimes(2);
  });

  it("returns ok when no social accounts are present", async () => {
    getPrivyLinkedIdentity.mockResolvedValueOnce({
      wallet: { address: "0x" + "a".repeat(40) },
    });

    const result = await syncLinkedAccountsFromSession();

    expect(result).toEqual({ ok: true, updated: 0 });
    expect(upsertLinkedAccount).not.toHaveBeenCalled();
  });

  it("falls back to twitter username when subject is missing", async () => {
    getPrivyLinkedIdentity.mockResolvedValueOnce({
      wallet: { address: "0x" + "a".repeat(40) },
      twitter: { username: "alice_x" },
    });

    const result = await syncLinkedAccountsFromSession();

    expect(result).toEqual({ ok: true, updated: 1 });
    expect(upsertLinkedAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: "x",
        platformId: "alice_x",
      })
    );
  });
});
