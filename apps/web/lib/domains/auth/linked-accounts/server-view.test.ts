import { describe, expect, it } from "vitest";
import {
  getPreferredLinkedFarcasterAccount,
  resolveFarcasterAccount,
  toLinkedAccountsServerView,
} from "./server-view";
import type { LinkedAccountsResponse } from "./types";

function makeResponse(accounts: LinkedAccountsResponse["accounts"]): LinkedAccountsResponse {
  return {
    address: `0x${"a".repeat(40)}`,
    accounts,
  };
}

describe("linked account server view", () => {
  it("ignores invalid farcaster platform ids when choosing the preferred linked account", () => {
    const linkedAccounts = toLinkedAccountsServerView(
      makeResponse([
        {
          platform: "farcaster",
          platformId: "not-a-number",
          username: "bad",
          displayName: "Bad",
          avatarUrl: null,
          source: "neynar_signer",
          canPost: true,
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          platform: "farcaster",
          platformId: "42",
          username: "good",
          displayName: "Good",
          avatarUrl: null,
          source: "verified_address",
          canPost: false,
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ])
    );

    expect(getPreferredLinkedFarcasterAccount(linkedAccounts.accounts)).toMatchObject({
      platformId: "42",
      fid: 42,
    });
  });

  it("falls back to the session account when linked farcaster rows have invalid ids", () => {
    const linkedAccounts = toLinkedAccountsServerView(
      makeResponse([
        {
          platform: "farcaster",
          platformId: "legacy-row",
          username: "bad",
          displayName: "Bad",
          avatarUrl: null,
          source: "verified_address",
          canPost: false,
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ])
    );

    expect(
      resolveFarcasterAccount({
        linkedAccounts: linkedAccounts.accounts,
        sessionFarcaster: {
          fid: 77,
          username: "session-user",
          displayName: "Session User",
          pfp: "https://example.com/session.png",
          source: "privy",
        },
      })
    ).toEqual({
      fid: 77,
      username: "session-user",
      displayName: "Session User",
      avatarUrl: "https://example.com/session.png",
      source: "session",
    });
  });
});
