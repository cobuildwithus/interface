import { afterEach, describe, expect, it, vi } from "vitest";

import { isGlobalAdmin, isAdminFor } from "./admins";
import { CACHE_TTL } from "./cache";

describe("isGlobalAdmin", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns false for null", () => {
    expect(isGlobalAdmin(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isGlobalAdmin(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isGlobalAdmin("")).toBe(false);
  });

  it("returns false for non-admin address", () => {
    process.env = { ...originalEnv, GLOBAL_ADMINS: "0xabc" };
    expect(isGlobalAdmin("0x0000000000000000000000000000000000000001")).toBe(false);
  });

  it("returns true for admin address from env", () => {
    process.env = { ...originalEnv, GLOBAL_ADMINS: "0xabc,0xdef" };
    expect(isGlobalAdmin("0xabc")).toBe(true);
  });

  it("is case insensitive", () => {
    process.env = { ...originalEnv, GLOBAL_ADMINS: "0xAbC" };
    // Both should return same result regardless of casing
    const upperResult = isGlobalAdmin("0xABC");
    const lowerResult = isGlobalAdmin("0xabc");
    expect(upperResult).toBe(lowerResult);
  });
});

describe("isAdminFor", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns false for null address", () => {
    expect(isAdminFor(null, ["0xadmin"])).toBe(false);
  });

  it("returns false for undefined address", () => {
    expect(isAdminFor(undefined, ["0xadmin"])).toBe(false);
  });

  it("returns false for empty string address", () => {
    expect(isAdminFor("", ["0xadmin"])).toBe(false);
  });

  it("returns true when address is in round admins", () => {
    expect(isAdminFor("0xadmin", ["0xadmin"])).toBe(true);
  });

  it("returns true for case-insensitive match in round admins", () => {
    expect(isAdminFor("0xADMIN", ["0xadmin"])).toBe(true);
    expect(isAdminFor("0xadmin", ["0xadmin"])).toBe(true);
    // Also works when roundAdmins has uppercase
    expect(isAdminFor("0xadmin", ["0xADMIN"])).toBe(true);
    expect(isAdminFor("0xADMIN", ["0xADMIN"])).toBe(true);
  });

  it("returns false when address is not in round admins or global admins", () => {
    expect(isAdminFor("0xuser", ["0xadmin"])).toBe(false);
  });

  it("returns true when address is in global admins env", () => {
    process.env = { ...originalEnv, GLOBAL_ADMINS: "0xadmin" };
    expect(isAdminFor("0xadmin", [])).toBe(true);
  });

  it("returns false when round admins is empty and not global admin", () => {
    expect(isAdminFor("0xuser", [])).toBe(false);
  });

  it("checks against all round admins", () => {
    expect(isAdminFor("0xadmin2", ["0xadmin1", "0xadmin2", "0xadmin3"])).toBe(true);
  });

  it("returns false when address does not match any round admin", () => {
    expect(isAdminFor("0xnot-admin", ["0xadmin1", "0xadmin2"])).toBe(false);
  });
});

describe("CACHE_TTL", () => {
  it("exports expected TTL values", () => {
    expect(CACHE_TTL.PROFILE).toBe(60 * 60 * 24 * 3);
    expect(CACHE_TTL.SWAPS).toBe(60);
  });
});

describe("db clients coverage", () => {
  const originalEnv = process.env;
  type GlobalWithPrisma = typeof globalThis & { prisma?: object };
  const globalForTest = globalThis as GlobalWithPrisma;

  afterEach(() => {
    process.env = originalEnv;
    delete globalForTest.prisma;
    vi.resetModules();
  });

  it("covers cobuild-db-client create + reuse branches", async () => {
    vi.resetModules();

    const PrismaClient = vi.fn();
    const PrismaPg = vi.fn();
    const readReplicas = vi.fn();
    const Pool = vi.fn();
    vi.doMock("@/generated/prisma/client", () => ({ PrismaClient }));
    vi.doMock("@prisma/adapter-pg", () => ({ PrismaPg }));
    vi.doMock("@prisma/extension-read-replicas", () => ({ readReplicas }));
    vi.doMock("pg", () => ({ Pool }));

    process.env = { ...originalEnv };
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_REPLICA_URL;
    delete globalForTest.prisma;

    await expect(import("../server/db/cobuild-db-client")).rejects.toThrow(
      "DATABASE_URL is not set"
    );

    vi.resetModules();
    process.env = { ...originalEnv, DATABASE_URL: "postgres://primary" };
    await expect(import("../server/db/cobuild-db-client")).rejects.toThrow(
      "DATABASE_REPLICA_URL is not set"
    );

    vi.resetModules();
    const existing = { existing: true };
    globalForTest.prisma = existing;
    const modReuse = await import("../server/db/cobuild-db-client");
    expect(modReuse.default).toBe(existing);

    vi.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: "postgres://primary",
      DATABASE_REPLICA_URL: "postgres://replica",
      NODE_ENV: "test",
    };
    delete globalForTest.prisma;
    const adapterInstance = { kind: "pg" };
    PrismaPg.mockImplementation(() => adapterInstance);
    Pool.mockImplementation(() => ({ pool: true, on: vi.fn() }));
    const extendedInstance = { extended: true };
    const clientInstance = { $extends: vi.fn(() => extendedInstance) };
    readReplicas.mockReturnValue({ kind: "readReplicas" });
    PrismaClient.mockImplementation(() => clientInstance);
    const modCreate = await import("../server/db/cobuild-db-client");
    expect(modCreate.default).toBe(extendedInstance);
    expect(clientInstance.$extends).toHaveBeenCalledWith({ kind: "readReplicas" });
    expect(globalForTest.prisma).toBe(extendedInstance);
  });
});
