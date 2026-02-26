import { describe, expect, it, vi } from "vitest";

const { getFarcasterChannelUrlMock } = vi.hoisted(() => ({
  getFarcasterChannelUrlMock: vi.fn(
    (channel: string) => `https://farcaster.xyz/~/channel/${channel}`
  ),
}));

vi.mock("@/lib/integrations/farcaster/urls", () => ({
  getFarcasterChannelUrl: (channel: string) => getFarcasterChannelUrlMock(channel),
}));

import { COBUILD_CHANNEL_URL, bufferToHash, hasText, toFidNumber, toNumber } from "./shared";

describe("casts shared helpers", () => {
  it("builds the cobuild channel URL from farcaster channel helper", () => {
    expect(getFarcasterChannelUrlMock).toHaveBeenCalledWith("cobuild");
    expect(COBUILD_CHANNEL_URL).toBe("https://farcaster.xyz/~/channel/cobuild");
  });

  it("recognizes whether a value has non-whitespace text", () => {
    expect(hasText("hello")).toBe(true);
    expect(hasText("  hello  ")).toBe(true);
    expect(hasText("   ")).toBe(false);
    expect(hasText(null)).toBe(false);
    expect(hasText(undefined)).toBe(false);
  });

  it("converts numeric-like values to numbers and rejects invalid values", () => {
    expect(toNumber(12)).toBe(12);
    expect(toNumber(12n)).toBe(12);
    expect(toNumber(" 42.5 ")).toBe(42.5);
    expect(toNumber("")).toBeNull();
    expect(toNumber("not-a-number")).toBeNull();
    expect(toNumber(Number.POSITIVE_INFINITY)).toBeNull();
    expect(toNumber(null)).toBeNull();
  });

  it("converts fid values to numbers with safe fallback to zero", () => {
    expect(toFidNumber(123n)).toBe(123);
    expect(toFidNumber(456)).toBe(456);
    expect(toFidNumber(Number.NaN)).toBe(0);
    expect(toFidNumber(null)).toBe(0);
    expect(toFidNumber(undefined)).toBe(0);
  });

  it("converts cast hash buffers to hex strings", () => {
    expect(bufferToHash(Buffer.from("abcd", "hex"))).toBe("0xabcd");
    expect(bufferToHash(null)).toBeNull();
  });
});
