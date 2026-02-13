import { describe, expect, it } from "vitest";
import { normalizeCastHashRaw, normalizeCastHash, castHashToBuffer } from "./normalize";

describe("normalizeCastHashRaw", () => {
  const validHash = "a".repeat(40);

  it("returns lowercase hex without prefix for valid hash", () => {
    expect(normalizeCastHashRaw(validHash)).toBe(validHash);
  });

  it("strips 0x prefix", () => {
    expect(normalizeCastHashRaw(`0x${validHash}`)).toBe(validHash);
  });

  it("strips 0X prefix (uppercase)", () => {
    expect(normalizeCastHashRaw(`0X${validHash}`)).toBe(validHash);
  });

  it("lowercases uppercase hex", () => {
    const upper = "A".repeat(40);
    expect(normalizeCastHashRaw(upper)).toBe(validHash);
  });

  it("trims whitespace", () => {
    expect(normalizeCastHashRaw(`  ${validHash}  `)).toBe(validHash);
  });

  it("returns null for empty string", () => {
    expect(normalizeCastHashRaw("")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(normalizeCastHashRaw(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(normalizeCastHashRaw(undefined)).toBeNull();
  });

  it("returns null for hash too short (39 chars)", () => {
    expect(normalizeCastHashRaw("a".repeat(39))).toBeNull();
  });

  it("returns null for hash too long (41 chars)", () => {
    expect(normalizeCastHashRaw("a".repeat(41))).toBeNull();
  });

  it("returns null for invalid hex characters", () => {
    expect(normalizeCastHashRaw("g".repeat(40))).toBeNull();
  });

  it("returns null for mixed valid/invalid chars", () => {
    expect(normalizeCastHashRaw("0x" + "a".repeat(38) + "zz")).toBeNull();
  });
});

describe("normalizeCastHash", () => {
  const validHash = "b".repeat(40);

  it("returns 0x-prefixed lowercase hex", () => {
    expect(normalizeCastHash(validHash)).toBe(`0x${validHash}`);
  });

  it("preserves prefix if already present", () => {
    expect(normalizeCastHash(`0x${validHash}`)).toBe(`0x${validHash}`);
  });

  it("returns null for invalid input", () => {
    expect(normalizeCastHash("invalid")).toBeNull();
  });

  it("returns null for null", () => {
    expect(normalizeCastHash(null)).toBeNull();
  });
});

describe("castHashToBuffer", () => {
  const validHash = "c".repeat(40);

  it("returns Buffer for valid hash", () => {
    const result = castHashToBuffer(validHash);
    expect(result).toBeInstanceOf(Buffer);
    expect(result?.length).toBe(20);
  });

  it("returns same buffer regardless of prefix", () => {
    const withPrefix = castHashToBuffer(`0x${validHash}`);
    const withoutPrefix = castHashToBuffer(validHash);
    expect(withPrefix).toEqual(withoutPrefix);
  });

  it("returns null for invalid hash", () => {
    expect(castHashToBuffer("invalid")).toBeNull();
  });

  it("returns null for null", () => {
    expect(castHashToBuffer(null)).toBeNull();
  });

  it("round-trips correctly", () => {
    const buffer = castHashToBuffer(validHash);
    expect(buffer?.toString("hex")).toBe(validHash);
  });
});
