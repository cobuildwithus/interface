import { describe, expect, it } from "vitest";
import {
  parsePostInput,
  PLATFORMS,
  detectPostPlatform,
  formatPlatformList,
  getDefaultPostInputPlaceholder,
} from "./platforms";

describe("parsePostInput", () => {
  it("returns null for empty input", () => {
    expect(parsePostInput("")).toBeNull();
    expect(parsePostInput("   ")).toBeNull();
  });

  describe("X platform", () => {
    it("detects X status URLs with username", () => {
      const parsed = parsePostInput("https://x.com/faircaster/status/1996708979628491080");
      expect(parsed?.platform).toBe("x");
      expect(parsed?.candidate.kind).toBe("ready");
      if (parsed?.candidate.kind === "ready") {
        expect(parsed.candidate.username).toBe("faircaster");
      }
    });

    it("accepts raw tweet IDs", () => {
      const parsed = parsePostInput("1999394881027080400");
      expect(parsed?.platform).toBe("x");
      expect(parsed?.candidate.kind).toBe("ready");
    });
  });

  describe("Farcaster platform", () => {
    it("detects Farcaster URLs with username", () => {
      const parsed = parsePostInput("https://farcaster.xyz/rocketman/0x62ed03c3");
      expect(parsed?.platform).toBe("farcaster");
      expect(parsed?.candidate.kind).toBe("needs_resolution");
      if (parsed?.candidate.kind === "needs_resolution") {
        expect(parsed.candidate.username).toBe("rocketman");
      }
    });

    it("detects Farcaster URLs with full hash and username", () => {
      const hash = `0x${"a".repeat(40)}`;
      const parsed = parsePostInput(`https://farcaster.xyz/willhay/${hash}`);
      expect(parsed?.platform).toBe("farcaster");
      expect(parsed?.candidate.kind).toBe("ready");
      if (parsed?.candidate.kind === "ready") {
        expect(parsed.candidate.username).toBe("willhay");
      }
    });

    it("accepts raw Farcaster hashes", () => {
      const hash = `0x${"a".repeat(40)}`;
      const parsed = parsePostInput(hash);
      expect(parsed?.platform).toBe("farcaster");
      expect(parsed?.candidate.kind).toBe("ready");
    });

    it("accepts conversation URLs", () => {
      const hash = `0x${"a".repeat(40)}`;
      const parsed = parsePostInput(`https://farcaster.xyz/~/conversations/${hash}`);
      expect(parsed?.platform).toBe("farcaster");
      expect(parsed?.candidate.kind).toBe("ready");
    });

    it("accepts supercast URLs", () => {
      const hash = `0x${"a".repeat(40)}`;
      const parsed = parsePostInput(`https://supercast.xyz/c/${hash}`);
      expect(parsed?.platform).toBe("farcaster");
      expect(parsed?.candidate.kind).toBe("ready");
    });

    it("returns incomplete for short hash without URL", () => {
      const parsed = parsePostInput("0xabc");
      expect(parsed?.platform).toBe("farcaster");
      expect(parsed?.candidate.kind).toBe("incomplete");
    });
  });

  it("returns null for unsupported input", () => {
    expect(parsePostInput("not-a-url")).toBeNull();
  });
});

describe("platform input validation", () => {
  describe("X platform", () => {
    const xPlatform = PLATFORMS.x;

    it("returns ready with username for valid X URL", () => {
      const result = xPlatform.input.toPostRefCandidate(
        "https://x.com/faircaster/status/1996708979628491080"
      );
      expect(result.kind).toBe("ready");
      if (result.kind === "ready") {
        expect(result.username).toBe("faircaster");
      }
    });

    it("returns ready for raw tweet ID", () => {
      const result = xPlatform.input.toPostRefCandidate("1996708979628491080");
      expect(result.kind).toBe("ready");
    });

    it("returns error for invalid X input", () => {
      const result = xPlatform.input.toPostRefCandidate("not-a-tweet");
      expect(result.kind).toBe("error");
    });
  });

  describe("Farcaster platform", () => {
    const farcasterPlatform = PLATFORMS.farcaster;

    it("returns ready with username for warpcast URL with full hash", () => {
      const hash = `0x${"a".repeat(40)}`;
      const result = farcasterPlatform.input.toPostRefCandidate(
        `https://warpcast.com/rocketman/${hash}`
      );
      expect(result.kind).toBe("ready");
      if (result.kind === "ready") {
        expect(result.username).toBe("rocketman");
      }
    });

    it("returns needs_resolution with username for farcaster.xyz URL with short hash", () => {
      const result = farcasterPlatform.input.toPostRefCandidate(
        "https://farcaster.xyz/rocketman/0x62ed03c3"
      );
      expect(result.kind).toBe("needs_resolution");
      if (result.kind === "needs_resolution") {
        expect(result.username).toBe("rocketman");
      }
    });

    it("returns ready for raw hash", () => {
      const hash = `0x${"a".repeat(40)}`;
      const result = farcasterPlatform.input.toPostRefCandidate(hash);
      expect(result.kind).toBe("ready");
    });

    it("returns ready for conversation URL", () => {
      const hash = `0x${"a".repeat(40)}`;
      const result = farcasterPlatform.input.toPostRefCandidate(
        `https://farcaster.xyz/~/conversations/${hash}`
      );
      expect(result.kind).toBe("ready");
    });

    it("returns error for invalid Farcaster input", () => {
      const result = farcasterPlatform.input.toPostRefCandidate("not-a-cast");
      expect(result.kind).toBe("error");
    });
  });
});

describe("platform utilities", () => {
  it("detects post platform", () => {
    expect(detectPostPlatform("1996708979628491080")).toBe("x");
    expect(detectPostPlatform("")).toBeNull();
  });

  it("checks linked account state per platform", () => {
    expect(PLATFORMS.farcaster.isLinked({ farcaster: true, twitter: false })).toBe(true);
    expect(PLATFORMS.x.isLinked({ farcaster: false, twitter: true })).toBe(true);
  });

  it("formats platform list", () => {
    expect(formatPlatformList(["x"])).toBe("X");
    expect(formatPlatformList(["farcaster", "x"])).toBe("Farcaster or X");
    expect(formatPlatformList([])).toBe("");
  });

  it("builds compose URLs and placeholder", () => {
    const farcasterUrl = PLATFORMS.farcaster.composeUrl("hello");
    expect(farcasterUrl).toContain("channelKey=cobuild");
    const farcasterBase = PLATFORMS.farcaster.composeUrl();
    expect(farcasterBase).toContain("channelKey=cobuild");
    const xUrl = PLATFORMS.x.composeUrl("hi @cobuild");
    expect(xUrl).toContain("justcobuild");
    const xBase = PLATFORMS.x.composeUrl();
    expect(xBase).toBe("https://x.com/intent/post");
    expect(getDefaultPostInputPlaceholder()).toContain("farcaster.xyz");
  });
});
