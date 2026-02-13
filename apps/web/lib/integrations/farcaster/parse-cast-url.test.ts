import { describe, it, expect } from "vitest";
import {
  parseCastInput,
  extractFullHashFromUrl,
  isFullCastHash,
  extractUsernameFromCastUrl,
} from "./parse-cast-url";

const FULL_HASH = "0x85d28903a3b4c7dbbfa8e7e16a39f150d001e00a";
const SHORT_HASH = "0x85d289";

describe("parseCastInput", () => {
  describe("raw hashes", () => {
    it("parses a full hash (no username)", () => {
      const result = parseCastInput(FULL_HASH);
      expect(result).toEqual({
        hash: FULL_HASH,
        isFullHash: true,
        url: null,
        username: null,
      });
    });

    it("parses a short hash (no username)", () => {
      const result = parseCastInput(SHORT_HASH);
      expect(result).toEqual({
        hash: SHORT_HASH,
        isFullHash: false,
        url: null,
        username: null,
      });
    });

    it("trims whitespace", () => {
      const result = parseCastInput(`  ${FULL_HASH}  `);
      expect(result?.hash).toBe(FULL_HASH);
    });

    it("returns null for invalid hash", () => {
      expect(parseCastInput("0xGGGG")).toBeNull();
      expect(parseCastInput("not-a-hash")).toBeNull();
    });

    it("returns null for empty input", () => {
      expect(parseCastInput("")).toBeNull();
      expect(parseCastInput("   ")).toBeNull();
    });
  });

  describe("farcaster.xyz/~/conversations URLs", () => {
    it("parses conversation URL with full hash (no username)", () => {
      const url = `https://farcaster.xyz/~/conversations/${FULL_HASH}`;
      const result = parseCastInput(url);
      expect(result).toEqual({
        hash: FULL_HASH,
        isFullHash: true,
        url,
        username: null,
      });
    });

    it("parses conversation URL with short hash (no username)", () => {
      const url = `https://farcaster.xyz/~/conversations/${SHORT_HASH}`;
      const result = parseCastInput(url);
      expect(result).toEqual({
        hash: SHORT_HASH,
        isFullHash: false,
        url,
        username: null,
      });
    });

    it("handles www prefix", () => {
      const url = `https://www.farcaster.xyz/~/conversations/${FULL_HASH}`;
      const result = parseCastInput(url);
      expect(result?.hash).toBe(FULL_HASH);
      expect(result?.username).toBeNull();
    });

    it("handles http protocol", () => {
      const url = `http://farcaster.xyz/~/conversations/${FULL_HASH}`;
      const result = parseCastInput(url);
      expect(result?.hash).toBe(FULL_HASH);
      expect(result?.username).toBeNull();
    });
  });

  describe("farcaster.xyz/username URLs", () => {
    it("parses standard farcaster URL with username", () => {
      const url = `https://farcaster.xyz/willhay/${FULL_HASH}`;
      const result = parseCastInput(url);
      expect(result).toEqual({
        hash: FULL_HASH,
        isFullHash: true,
        url,
        username: "willhay",
      });
    });

    it("parses URL with short hash and username", () => {
      const url = `https://farcaster.xyz/willhay/${SHORT_HASH}`;
      const result = parseCastInput(url);
      expect(result).toEqual({
        hash: SHORT_HASH,
        isFullHash: false,
        url,
        username: "willhay",
      });
    });

    it("parses rocketman example", () => {
      const url = "https://farcaster.xyz/rocketman/0x62ed03c3";
      const result = parseCastInput(url);
      expect(result?.hash).toBe("0x62ed03c3");
      expect(result?.username).toBe("rocketman");
    });
  });

  describe("warpcast.com URLs", () => {
    it("parses warpcast URL with username", () => {
      const url = `https://warpcast.com/willhay/${FULL_HASH}`;
      const result = parseCastInput(url);
      expect(result).toEqual({
        hash: FULL_HASH,
        isFullHash: true,
        url,
        username: "willhay",
      });
    });

    it("handles www prefix", () => {
      const url = `https://www.warpcast.com/willhay/${FULL_HASH}`;
      const result = parseCastInput(url);
      expect(result?.hash).toBe(FULL_HASH);
      expect(result?.username).toBe("willhay");
    });
  });

  describe("supercast.xyz URLs", () => {
    it("parses supercast URL (no username)", () => {
      const url = `https://supercast.xyz/c/${FULL_HASH}`;
      const result = parseCastInput(url);
      expect(result).toEqual({
        hash: FULL_HASH,
        isFullHash: true,
        url,
        username: null,
      });
    });

    it("handles www prefix", () => {
      const url = `https://www.supercast.xyz/c/${FULL_HASH}`;
      const result = parseCastInput(url);
      expect(result?.hash).toBe(FULL_HASH);
      expect(result?.username).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("handles URL with query params (captures base URL)", () => {
      const baseUrl = `https://farcaster.xyz/willhay/${FULL_HASH}`;
      const url = `${baseUrl}?ref=test`;
      const result = parseCastInput(url);
      expect(result?.hash).toBe(FULL_HASH);
      expect(result?.url).toBe(baseUrl);
      expect(result?.username).toBe("willhay");
    });

    it("returns null for unrecognized domains", () => {
      expect(parseCastInput(`https://example.com/${FULL_HASH}`)).toBeNull();
    });

    it("is case insensitive for hash", () => {
      const upperHash = "0x85D28903A3B4C7DBBFA8E7E16A39F150D001E00A";
      const result = parseCastInput(upperHash);
      expect(result?.hash).toBe(upperHash);
      expect(result?.isFullHash).toBe(true);
    });
  });
});

describe("extractFullHashFromUrl", () => {
  it("extracts full hash from conversation URL", () => {
    const url = `https://farcaster.xyz/~/conversations/${FULL_HASH}`;
    expect(extractFullHashFromUrl(url)).toBe(FULL_HASH);
  });

  it("extracts full hash from standard URL", () => {
    const url = `https://farcaster.xyz/willhay/${FULL_HASH}`;
    expect(extractFullHashFromUrl(url)).toBe(FULL_HASH);
  });

  it("returns null for short hash URL", () => {
    const url = `https://farcaster.xyz/willhay/${SHORT_HASH}`;
    expect(extractFullHashFromUrl(url)).toBeNull();
  });

  it("returns null for invalid URL", () => {
    expect(extractFullHashFromUrl("not-a-url")).toBeNull();
  });
});

describe("extractUsernameFromCastUrl", () => {
  it("extracts username from farcaster.xyz URL", () => {
    expect(extractUsernameFromCastUrl(`https://farcaster.xyz/rocketman/${FULL_HASH}`)).toBe(
      "rocketman"
    );
  });

  it("extracts username from warpcast.com URL", () => {
    expect(extractUsernameFromCastUrl(`https://warpcast.com/willhay/${FULL_HASH}`)).toBe("willhay");
  });

  it("returns null for raw hash", () => {
    expect(extractUsernameFromCastUrl(FULL_HASH)).toBeNull();
  });

  it("returns null for conversation URL", () => {
    expect(
      extractUsernameFromCastUrl(`https://farcaster.xyz/~/conversations/${FULL_HASH}`)
    ).toBeNull();
  });

  it("returns null for supercast URL", () => {
    expect(extractUsernameFromCastUrl(`https://supercast.xyz/c/${FULL_HASH}`)).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(extractUsernameFromCastUrl("not-a-url")).toBeNull();
    expect(extractUsernameFromCastUrl("")).toBeNull();
  });
});

describe("isFullCastHash", () => {
  it("returns true for valid full hash", () => {
    expect(isFullCastHash(FULL_HASH)).toBe(true);
  });

  it("returns false for short hash", () => {
    expect(isFullCastHash(SHORT_HASH)).toBe(false);
  });

  it("returns false for invalid hash", () => {
    expect(isFullCastHash("not-a-hash")).toBe(false);
    expect(isFullCastHash("0xGGGG")).toBe(false);
  });

  it("returns false for hash that is too long", () => {
    expect(isFullCastHash(`${FULL_HASH}aa`)).toBe(false);
  });
});
