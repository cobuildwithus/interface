import { describe, expect, it } from "vitest";

import {
  FARCASTER_USERNAME_REGEX,
  isValidFarcasterUsername,
  normalizeFarcasterUsername,
} from "./fname";

describe("normalizeFarcasterUsername", () => {
  it("lowercases and strips @", () => {
    expect(normalizeFarcasterUsername("@Alice")).toBe("alice");
  });

  it("trims whitespace", () => {
    expect(normalizeFarcasterUsername("  bob  ")).toBe("bob");
  });
});

describe("FARCASTER_USERNAME_REGEX", () => {
  it("accepts valid usernames", () => {
    expect(FARCASTER_USERNAME_REGEX.test("alice")).toBe(true);
    expect(FARCASTER_USERNAME_REGEX.test("a-1")).toBe(true);
  });

  it("rejects invalid usernames", () => {
    expect(FARCASTER_USERNAME_REGEX.test("-alice")).toBe(false);
    expect(FARCASTER_USERNAME_REGEX.test("alice_1")).toBe(false);
    expect(FARCASTER_USERNAME_REGEX.test("")).toBe(false);
  });
});

describe("isValidFarcasterUsername", () => {
  it("normalizes input before validating", () => {
    expect(isValidFarcasterUsername("@ALICE")).toBe(true);
  });

  it("returns false for invalid inputs", () => {
    expect(isValidFarcasterUsername("a_b")).toBe(false);
    expect(isValidFarcasterUsername("")).toBe(false);
  });
});
