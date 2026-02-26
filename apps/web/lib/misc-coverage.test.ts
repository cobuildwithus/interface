import { describe, expect, it, vi, afterEach } from "vitest";
import { getAiVerdict } from "@/lib/shared/ai-verdict";
import {
  getCastUrl,
  getFarcasterChannelUrl,
  getFarcasterProfileUrl,
} from "@/lib/integrations/farcaster/urls";
import { getPostOwnershipMismatchError } from "@/lib/domains/social/post-ownership";
import { cn, truncateAddress } from "@/lib/shared/utils";
import { truncateWords } from "@/lib/shared/text/truncate-words";
import { normalizeUsernames } from "@/lib/domains/rules/rules/core/normalize";
import { getProfileUrl } from "@/lib/domains/profile/types";

describe("ai verdict", () => {
  it("reads verdict + reason from flexible keys", () => {
    const verdict = getAiVerdict({
      is_valid: true,
      rationale: "Looks good",
    });

    expect(verdict).toEqual({ isValid: true, reason: "Looks good" });
  });

  it("returns nulls when no keys match", () => {
    const verdict = getAiVerdict({ foo: 1, bar: "nope" });
    expect(verdict).toEqual({ isValid: null, reason: null });
  });
});

describe("config docsUrl", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("uses NEXT_PUBLIC_DOCS_URL when set", async () => {
    process.env = {
      ...process.env,
      NEXT_PUBLIC_DOCS_URL: "https://docs.example.com",
      NODE_ENV: "production",
    };

    const mod = await import("@/lib/config/docs");
    expect(mod.docsUrl).toBe("https://docs.example.com");
  });

  it("falls back to localhost in development", async () => {
    delete process.env.NEXT_PUBLIC_DOCS_URL;
    process.env = { ...process.env, NODE_ENV: "development" };

    const mod = await import("@/lib/config/docs");
    expect(mod.docsUrl).toBe("http://localhost:5173");
  });

  it("falls back to production docs in prod", async () => {
    delete process.env.NEXT_PUBLIC_DOCS_URL;
    process.env = { ...process.env, NODE_ENV: "production" };

    const mod = await import("@/lib/config/docs");
    expect(mod.docsUrl).toBe("https://docs.co.build");
  });
});

describe("farcaster helpers", () => {
  it("builds farcaster URLs", () => {
    expect(getCastUrl("0xabc")).toBe("https://farcaster.xyz/~/conversations/0xabc");
    expect(getFarcasterProfileUrl("alice")).toBe("https://farcaster.xyz/alice");
    expect(getFarcasterChannelUrl("cobuild")).toBe("https://farcaster.xyz/~/channel/cobuild");
  });
});

describe("post ownership mismatch", () => {
  it("returns null when missing usernames", () => {
    expect(
      getPostOwnershipMismatchError({ platform: "x", urlUsername: null, linkedUsername: "bob" })
    ).toBeNull();
  });

  it("returns error for mismatched usernames", () => {
    const error = getPostOwnershipMismatchError({
      platform: "farcaster",
      urlUsername: "@Alice",
      linkedUsername: "bob",
    });
    expect(error).toBe("This post belongs to @alice, not your linked account @bob.");
  });

  it("returns null for matching usernames", () => {
    const error = getPostOwnershipMismatchError({
      platform: "farcaster",
      urlUsername: "@Alice",
      linkedUsername: "alice",
    });
    expect(error).toBeNull();
  });
});

describe("utility helpers", () => {
  it("merges classnames", () => {
    expect(cn("px-2", false && "hidden", "px-4")).toBe("px-4");
  });

  it("truncates addresses", () => {
    expect(truncateAddress("0x1234567890abcdef")).toBe("0x1234…cdef");
    expect(truncateAddress("")).toBe("");
  });
});

describe("truncateWords", () => {
  it("returns fallback when empty", () => {
    expect(truncateWords(" ", 3)).toBe("Submission");
  });

  it("does not truncate when under limit", () => {
    expect(truncateWords("hello world", 3)).toBe("hello world");
  });

  it("truncates with ellipsis", () => {
    expect(truncateWords("one two three four", 2)).toBe("one two…");
  });
});

describe("normalizeUsernames", () => {
  it("strips @ and lowercases", () => {
    expect(normalizeUsernames(["@Alice", " ", "Bob "])).toEqual(["alice", "bob"]);
  });
});

describe("profile url", () => {
  it("uses farcaster url when username provided", () => {
    expect(getProfileUrl("0xabc", "alice")).toBe("https://farcaster.xyz/alice");
  });

  it("falls back to basescan when no username", () => {
    expect(getProfileUrl("0xabc", null)).toBe("https://basescan.org/address/0xabc");
  });
});
