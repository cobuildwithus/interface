import { describe, expect, it } from "vitest";
import {
  hasCastPermission,
  isValidSignerUuid,
  normalizeFid,
  normalizeSignerPermissions,
} from "./signer-utils";

describe("normalizeFid", () => {
  it("accepts numeric fid", () => {
    expect(normalizeFid(123)).toBe(123);
  });

  it("accepts string fid", () => {
    expect(normalizeFid("456")).toBe(456);
  });

  it("rejects invalid fid values", () => {
    expect(normalizeFid("abc")).toBeNull();
    expect(normalizeFid(-1)).toBeNull();
    expect(normalizeFid(0)).toBeNull();
    expect(normalizeFid(Number.NaN)).toBeNull();
  });

  it("rejects unsafe fid values", () => {
    expect(normalizeFid(Number.MAX_SAFE_INTEGER + 1)).toBeNull();
  });
});

describe("isValidSignerUuid", () => {
  it("accepts a valid uuid", () => {
    expect(isValidSignerUuid("8d13fd9c-1dd6-4e33-8f07-4a3cdd6e9b3b")).toBe(true);
  });

  it("rejects invalid uuid", () => {
    expect(isValidSignerUuid("not-a-uuid")).toBe(false);
  });
});

describe("normalizeSignerPermissions", () => {
  it("returns deduped permissions", () => {
    expect(normalizeSignerPermissions(["cast", "cast", "read"])).toEqual(["cast", "read"]);
  });

  it("rejects empty or invalid input", () => {
    expect(normalizeSignerPermissions([])).toBeNull();
    expect(normalizeSignerPermissions(null)).toBeNull();
    expect(normalizeSignerPermissions([""])).toBeNull();
  });

  it("normalizes casing and separators", () => {
    expect(normalizeSignerPermissions(["WRITE_ALL", "read-only"])).toEqual([
      "write_all",
      "read_only",
    ]);
  });
});

describe("hasCastPermission", () => {
  it("accepts explicit cast token", () => {
    expect(hasCastPermission(["cast"])).toBe(true);
  });

  it("accepts write_all tokens", () => {
    expect(hasCastPermission(["write_all"])).toBe(true);
    expect(hasCastPermission(["WRITE_ALL"])).toBe(true);
  });

  it("accepts publish_cast tokens", () => {
    expect(hasCastPermission(["publish_cast"])).toBe(true);
  });

  it("rejects read-only permissions", () => {
    expect(hasCastPermission(["read_only"])).toBe(false);
  });
});
