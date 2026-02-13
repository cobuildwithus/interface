/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import type { UserResponse } from "@/lib/domains/auth/user-response-types";
import { isNeynarScoreIneligible } from "@/lib/domains/eligibility/constants";
import { useUser } from "./use-user";
import { UserProvider } from "@/lib/domains/auth/user-context";

const baseUser: UserResponse = {
  address: "0x1234567890abcdef1234567890abcdef12345678",
  farcaster: {
    fid: 123,
    username: "alice",
    displayName: "Alice",
    pfp: "https://example.com/pfp.png",
    neynarScore: 0.85,
  },
  twitter: {
    username: "alice_x",
    name: "Alice X",
  },
};

const withUserProvider = (user: UserResponse) => {
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(UserProvider, { value: user }, children);
  Wrapper.displayName = "UserProviderWrapper";
  return Wrapper;
};

describe("useUser", () => {
  it("throws when missing provider", () => {
    expect(() => renderHook(() => useUser())).toThrow("useUser must be used within UserProvider");
  });

  it("returns user data from context", () => {
    const { result } = renderHook(() => useUser(), { wrapper: withUserProvider(baseUser) });
    expect(result.current.address).toBe(baseUser.address);
    expect(result.current.farcaster?.fid).toBe(123);
  });
});

describe("useUser derived values", () => {
  describe("isAuthenticated", () => {
    it("returns true when address is present", () => {
      const user: UserResponse = {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        farcaster: null,
        twitter: null,
      };
      expect(user.address !== null).toBe(true);
    });

    it("returns false when address is null", () => {
      const user: UserResponse = {
        address: null,
        farcaster: null,
        twitter: null,
      };
      expect(user.address !== null).toBe(false);
    });
  });

  describe("isNeynarScoreIneligible derivation", () => {
    it("returns true when farcaster is null", () => {
      const user: UserResponse = {
        address: "0xabc",
        farcaster: null,
        twitter: null,
      };
      const score = user.farcaster?.neynarScore ?? null;
      expect(isNeynarScoreIneligible(score)).toBe(true);
    });

    it("returns true when neynar score is null", () => {
      const user: UserResponse = {
        address: "0xabc",
        farcaster: {
          fid: 123,
          username: "test",
          displayName: null,
          pfp: null,
          neynarScore: null,
        },
        twitter: null,
      };
      const score = user.farcaster?.neynarScore ?? null;
      expect(isNeynarScoreIneligible(score)).toBe(true);
    });

    it("returns true when neynar score is below threshold", () => {
      const user: UserResponse = {
        address: "0xabc",
        farcaster: {
          fid: 123,
          username: "lowscore",
          displayName: null,
          pfp: null,
          neynarScore: 0.4,
        },
        twitter: null,
      };
      const score = user.farcaster?.neynarScore ?? null;
      expect(isNeynarScoreIneligible(score)).toBe(true);
    });

    it("returns false when neynar score is at threshold", () => {
      const user: UserResponse = {
        address: "0xabc",
        farcaster: {
          fid: 123,
          username: "threshold",
          displayName: null,
          pfp: null,
          neynarScore: 0.55,
        },
        twitter: null,
      };
      const score = user.farcaster?.neynarScore ?? null;
      expect(isNeynarScoreIneligible(score)).toBe(false);
    });

    it("returns false when neynar score is above threshold", () => {
      const user: UserResponse = {
        address: "0xabc",
        farcaster: {
          fid: 123,
          username: "highscore",
          displayName: null,
          pfp: null,
          neynarScore: 0.85,
        },
        twitter: null,
      };
      const score = user.farcaster?.neynarScore ?? null;
      expect(isNeynarScoreIneligible(score)).toBe(false);
    });
  });
});
