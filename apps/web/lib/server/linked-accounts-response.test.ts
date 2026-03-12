import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getLinkedAccountsByAddress } = vi.hoisted(() => ({
  getLinkedAccountsByAddress: vi.fn(),
}));

vi.mock("@/lib/domains/auth/linked-accounts/store", () => ({
  getLinkedAccountsByAddress,
}));

import { getLinkedAccountsResponse, getLinkedAccountsServerView } from "./linked-accounts-response";

describe("getLinkedAccountsResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty response when address missing", async () => {
    const result = await getLinkedAccountsResponse(null);
    expect(result).toEqual({ address: null, accounts: [] });
  });

  it("returns linked accounts for address", async () => {
    getLinkedAccountsByAddress.mockResolvedValueOnce([{ platform: "x" }]);
    const result = await getLinkedAccountsResponse("0xabc", { usePrimary: true });
    expect(getLinkedAccountsByAddress).toHaveBeenCalledWith("0xabc", { usePrimary: true });
    expect(result).toEqual({ address: "0xabc", accounts: [{ platform: "x" }] });
  });

  it("normalizes farcaster ids for server consumers", async () => {
    getLinkedAccountsByAddress.mockResolvedValueOnce([
      {
        platform: "farcaster",
        platformId: "42",
        username: "alice",
        displayName: "Alice",
        avatarUrl: "https://example.com/alice.png",
        source: "verified_address",
        canPost: false,
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        platform: "x",
        platformId: "alice_x",
        username: "alice_x",
        displayName: "Alice X",
        avatarUrl: null,
        source: "privy",
        canPost: false,
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ]);

    const result = await getLinkedAccountsServerView("0xabc");

    expect(result).toEqual({
      address: "0xabc",
      accounts: [
        expect.objectContaining({
          platform: "farcaster",
          platformId: "42",
          fid: 42,
        }),
        expect.objectContaining({
          platform: "x",
          platformId: "alice_x",
        }),
      ],
    });
  });
});
