import { describe, expect, it } from "vitest";
import { getPostOwnershipMismatchError } from "@/lib/domains/social/post-ownership";

describe("getPostOwnershipMismatchError", () => {
  it("returns null when either username is missing", () => {
    expect(
      getPostOwnershipMismatchError({
        platform: "farcaster",
        urlUsername: null,
        linkedUsername: "alice",
      })
    ).toBeNull();
    expect(
      getPostOwnershipMismatchError({
        platform: "farcaster",
        urlUsername: "alice",
        linkedUsername: null,
      })
    ).toBeNull();
  });

  it("normalizes usernames before comparing", () => {
    expect(
      getPostOwnershipMismatchError({
        platform: "farcaster",
        urlUsername: "@Alice ",
        linkedUsername: "alice",
      })
    ).toBeNull();
  });

  it("returns a helpful error when usernames differ", () => {
    expect(
      getPostOwnershipMismatchError({
        platform: "farcaster",
        urlUsername: "@Alice",
        linkedUsername: "bob",
      })
    ).toBe("This post belongs to @alice, not your linked account @bob.");
  });
});
