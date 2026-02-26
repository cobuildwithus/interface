import { describe, expect, it } from "vitest";
import {
  isWalletAccount,
  isFarcasterAccount,
  isTwitterAccount,
  parseLinkedAccountsJson,
  extractAccounts,
  toFarcasterAccount,
  toTwitterAccount,
  type LinkedAccount,
} from "./linked-accounts";

describe("isWalletAccount", () => {
  it("returns true for valid wallet account", () => {
    expect(isWalletAccount({ type: "wallet", address: "0x123" })).toBe(true);
  });

  it("returns false for wrong type", () => {
    expect(isWalletAccount({ type: "farcaster", fid: 123 })).toBe(false);
  });

  it("returns false for missing address", () => {
    expect(isWalletAccount({ type: "wallet" } as LinkedAccount)).toBe(false);
  });

  it("returns false for non-string address", () => {
    expect(isWalletAccount({ type: "wallet", address: 123 } as LinkedAccount)).toBe(false);
  });
});

describe("isFarcasterAccount", () => {
  it("returns true for valid farcaster account", () => {
    expect(isFarcasterAccount({ type: "farcaster", fid: 123 })).toBe(true);
  });

  it("returns true with optional fields", () => {
    expect(
      isFarcasterAccount({
        type: "farcaster",
        fid: 123,
        username: "alice",
        displayName: "Alice",
        pfp: "https://example.com/pfp.png",
      })
    ).toBe(true);
  });

  it("returns false for wrong type", () => {
    expect(isFarcasterAccount({ type: "wallet", address: "0x123" })).toBe(false);
  });

  it("returns false for missing fid", () => {
    expect(isFarcasterAccount({ type: "farcaster" } as LinkedAccount)).toBe(false);
  });

  it("returns false for non-number fid", () => {
    expect(isFarcasterAccount({ type: "farcaster", fid: "123" } as LinkedAccount)).toBe(false);
  });
});

describe("isTwitterAccount", () => {
  it("returns true for valid twitter account", () => {
    expect(isTwitterAccount({ type: "twitter_oauth" })).toBe(true);
  });

  it("returns true with optional fields", () => {
    expect(
      isTwitterAccount({
        type: "twitter_oauth",
        username: "alice",
        name: "Alice",
        profilePictureUrl: "https://example.com/pfp.png",
        subject: "12345",
      })
    ).toBe(true);
  });

  it("returns false for wrong type", () => {
    expect(isTwitterAccount({ type: "wallet", address: "0x123" })).toBe(false);
  });
});

describe("parseLinkedAccountsJson", () => {
  it("parses valid JSON array", () => {
    const json = JSON.stringify([{ type: "wallet", address: "0x123" }]);
    expect(parseLinkedAccountsJson(json)).toEqual([{ type: "wallet", address: "0x123" }]);
  });

  it("parses multiple accounts", () => {
    const accounts = [
      { type: "wallet", address: "0x123" },
      { type: "farcaster", fid: 456, username: "alice" },
      { type: "twitter_oauth", username: "alice_x" },
    ];
    expect(parseLinkedAccountsJson(JSON.stringify(accounts))).toEqual(accounts);
  });

  it("returns undefined for invalid JSON", () => {
    expect(parseLinkedAccountsJson("not json")).toBe(undefined);
  });

  it("returns undefined for non-array JSON", () => {
    expect(parseLinkedAccountsJson('{"type": "wallet"}')).toBe(undefined);
  });

  it("returns undefined for empty string", () => {
    expect(parseLinkedAccountsJson("")).toBe(undefined);
  });

  it("handles empty array", () => {
    expect(parseLinkedAccountsJson("[]")).toEqual([]);
  });
});

describe("extractAccounts", () => {
  it("extracts wallet account", () => {
    const accounts: LinkedAccount[] = [{ type: "wallet", address: "0x123" }];
    const result = extractAccounts(accounts);
    expect(result.wallet).toEqual({ type: "wallet", address: "0x123" });
    expect(result.farcaster).toBe(undefined);
    expect(result.twitter).toBe(undefined);
  });

  it("extracts farcaster account", () => {
    const accounts: LinkedAccount[] = [{ type: "farcaster", fid: 123, username: "alice" }];
    const result = extractAccounts(accounts);
    expect(result.farcaster).toEqual({ type: "farcaster", fid: 123, username: "alice" });
  });

  it("extracts twitter account", () => {
    const accounts: LinkedAccount[] = [{ type: "twitter_oauth", username: "alice" }];
    const result = extractAccounts(accounts);
    expect(result.twitter).toEqual({ type: "twitter_oauth", username: "alice" });
  });

  it("extracts all account types", () => {
    const accounts: LinkedAccount[] = [
      { type: "wallet", address: "0x123" },
      { type: "farcaster", fid: 456 },
      { type: "twitter_oauth", username: "alice" },
    ];
    const result = extractAccounts(accounts);
    expect(result.wallet?.address).toBe("0x123");
    expect(result.farcaster?.fid).toBe(456);
    expect(result.twitter?.username).toBe("alice");
  });

  it("returns first of each type when duplicates exist", () => {
    const accounts: LinkedAccount[] = [
      { type: "wallet", address: "0x111" },
      { type: "wallet", address: "0x222" },
    ];
    const result = extractAccounts(accounts);
    expect(result.wallet?.address).toBe("0x111");
  });

  it("returns empty object for empty array", () => {
    expect(extractAccounts([])).toEqual({
      wallet: undefined,
      farcaster: undefined,
      twitter: undefined,
    });
  });

  it("ignores unknown account types", () => {
    const accounts: LinkedAccount[] = [{ type: "unknown_type", data: "foo" }];
    const result = extractAccounts(accounts);
    expect(result.wallet).toBe(undefined);
    expect(result.farcaster).toBe(undefined);
    expect(result.twitter).toBe(undefined);
  });
});

describe("toFarcasterAccount", () => {
  it("converts linked account with privy source", () => {
    const linked = {
      type: "farcaster" as const,
      fid: 123,
      username: "alice",
      displayName: "Alice",
      pfp: "https://pfp.png",
    };
    expect(toFarcasterAccount(linked, "privy", 0.85)).toEqual({
      fid: 123,
      username: "alice",
      displayName: "Alice",
      pfp: "https://pfp.png",
      neynarScore: 0.85,
      source: "privy",
    });
  });

  it("converts profile with verified_address source", () => {
    const profile = { fid: 456, username: "bob", displayName: "Bob", pfp: "https://bob.png" };
    expect(toFarcasterAccount(profile, "verified_address", 0.72)).toEqual({
      fid: 456,
      username: "bob",
      displayName: "Bob",
      pfp: "https://bob.png",
      neynarScore: 0.72,
      source: "verified_address",
    });
  });

  it("handles undefined optional fields", () => {
    const linked = { type: "farcaster" as const, fid: 123 };
    expect(toFarcasterAccount(linked, "privy")).toEqual({
      fid: 123,
      username: undefined,
      displayName: undefined,
      pfp: undefined,
      neynarScore: undefined,
      source: "privy",
    });
  });

  it("handles null neynar score", () => {
    const linked = { type: "farcaster" as const, fid: 123, username: "test" };
    expect(toFarcasterAccount(linked, "privy", null)).toEqual({
      fid: 123,
      username: "test",
      displayName: undefined,
      pfp: undefined,
      neynarScore: null,
      source: "privy",
    });
  });
});

describe("toTwitterAccount", () => {
  it("converts linked account with all fields", () => {
    const linked = {
      type: "twitter_oauth" as const,
      username: "alice",
      name: "Alice",
      profilePictureUrl: "https://pfp.png",
      subject: "12345",
    };
    expect(toTwitterAccount(linked)).toEqual({
      username: "alice",
      name: "Alice",
      profilePictureUrl: "https://pfp.png",
      subject: "12345",
    });
  });

  it("handles undefined optional fields", () => {
    const linked = { type: "twitter_oauth" as const };
    expect(toTwitterAccount(linked)).toEqual({
      username: undefined,
      name: undefined,
      profilePictureUrl: undefined,
      subject: undefined,
    });
  });

  it("handles partial fields", () => {
    const linked = { type: "twitter_oauth" as const, username: "alice" };
    expect(toTwitterAccount(linked)).toEqual({
      username: "alice",
      name: undefined,
      profilePictureUrl: undefined,
      subject: undefined,
    });
  });
});
