import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildIdemKey,
  normalizeOptionalUrl,
  normalizeOptionalUrlArray,
} from "./farcaster-post-utils";

describe("farcaster-post-utils", () => {
  it("buildIdemKey returns a 16-char hex string without dashes", () => {
    const key = buildIdemKey();
    expect(key).toMatch(/^[0-9a-f]{16}$/i);
    expect(key.includes("-")).toBe(false);
  });

  it("normalizeOptionalUrl handles empty inputs", () => {
    expect(normalizeOptionalUrl(undefined)).toBeNull();
    expect(normalizeOptionalUrl(null)).toBeNull();
    expect(normalizeOptionalUrl("   ")).toBeNull();
  });

  it("normalizeOptionalUrl rejects invalid protocols", () => {
    expect(normalizeOptionalUrl("ftp://example.com")).toBeNull();
  });

  it("normalizeOptionalUrl accepts http(s) urls", () => {
    expect(normalizeOptionalUrl("https://example.com")).toBe("https://example.com");
    expect(normalizeOptionalUrl(" http://example.com ")).toBe("http://example.com");
  });

  it("normalizeOptionalUrlArray handles empty and invalid arrays", () => {
    expect(normalizeOptionalUrlArray(undefined)).toEqual([]);
    expect(normalizeOptionalUrlArray(null)).toEqual([]);
    expect(normalizeOptionalUrlArray([null])).toBeNull();
    expect(normalizeOptionalUrlArray(["https://ok.com", "bad"])).toBeNull();
  });

  it("normalizeOptionalUrlArray accepts arrays of urls", () => {
    expect(normalizeOptionalUrlArray(["https://a.com", "https://b.com"])).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });
});
