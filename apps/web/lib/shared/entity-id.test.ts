import { describe, expect, it } from "vitest";
import { normalizeEntityId, parseEntityId } from "./entity-id";

describe("entity-id", () => {
  it("normalizes Farcaster cast hashes with or without 0x", () => {
    const raw = "A".repeat(40);
    expect(normalizeEntityId(raw)).toBe(`0x${"a".repeat(40)}`);
    expect(normalizeEntityId(`0x${raw}`)).toBe(`0x${"a".repeat(40)}`);
  });

  it("extracts and normalizes Farcaster cast hashes from Farcaster URLs", () => {
    const hash = `0x${"b".repeat(40)}`;
    const url = `https://farcaster.xyz/alice/${hash}`;
    expect(parseEntityId(url)).toEqual({
      platform: "farcaster",
      entityId: hash,
      queryAliases: [hash, hash.slice(2)],
    });
  });

  it("normalizes X post ids and extracts ids from X/Twitter URLs", () => {
    const id = "1234567890123456789";
    const fromId = normalizeEntityId(id);
    const fromXUrl = normalizeEntityId(`https://x.com/alice/status/${id}?s=20`);
    const fromTwitterUrl = normalizeEntityId(`https://twitter.com/alice/status/${id}`);

    expect(fromId).toBe(id);
    expect(fromId).toBe(fromXUrl);
    expect(fromId).toBe(fromTwitterUrl);

    expect(parseEntityId(id)).toEqual({
      platform: "x",
      entityId: id,
      queryAliases: [id],
    });
  });

  it("returns null for invalid ids", () => {
    expect(normalizeEntityId("")).toBeNull();
    expect(normalizeEntityId("0x1234")).toBeNull();
    expect(normalizeEntityId("not-an-id")).toBeNull();
  });

  it("treats whitespace-only input as invalid", () => {
    expect(normalizeEntityId("   ")).toBeNull();
    expect(parseEntityId("\n\t")).toBeNull();
  });

  it("returns unknown ids only when allowUnknown is enabled", () => {
    expect(parseEntityId("Some Unknown ID")).toBeNull();
    expect(parseEntityId("Some Unknown ID", { allowUnknown: true })).toEqual({
      platform: "unknown",
      entityId: "Some Unknown ID",
      queryAliases: ["Some Unknown ID"],
    });
  });

  it("lowercases unknown ids when configured", () => {
    expect(parseEntityId("MiXeD Case", { allowUnknown: true, unknownCase: "lower" })).toEqual({
      platform: "unknown",
      entityId: "mixed case",
      queryAliases: ["mixed case"],
    });
  });
});
