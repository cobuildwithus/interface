import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { decryptJson, encryptJson } from "./encryption";

const KEY_ENV = "FARCASTER_SIGNER_ENCRYPTION_KEY";

describe("encryption helpers", () => {
  const originalEnv = process.env[KEY_ENV];

  beforeEach(() => {
    process.env[KEY_ENV] = Buffer.alloc(32, 7).toString("base64");
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env[KEY_ENV];
    } else {
      process.env[KEY_ENV] = originalEnv;
    }
  });

  it("round-trips encrypted payloads", () => {
    const payload = { fid: 123, signerUuid: "uuid" };
    const encrypted = encryptJson(payload);
    const decrypted = decryptJson<typeof payload>(encrypted);
    expect(decrypted).toEqual(payload);
  });

  it("throws when key is missing", () => {
    delete process.env[KEY_ENV];
    expect(() => encryptJson({ test: true })).toThrow(`${KEY_ENV} is not set`);
  });

  it("throws when key length is not 32 bytes", () => {
    process.env[KEY_ENV] = Buffer.alloc(31, 7).toString("base64");
    expect(() => encryptJson({ test: true })).toThrow(
      `${KEY_ENV} must be 32 bytes (base64-encoded)`
    );
  });

  it("uses a unique IV for each encryption", () => {
    const payload = { fid: 123, signerUuid: "uuid" };
    const encryptedA = encryptJson(payload);
    const encryptedB = encryptJson(payload);

    expect(encryptedA).not.toBe(encryptedB);
    expect(decryptJson<typeof payload>(encryptedA)).toEqual(payload);
    expect(decryptJson<typeof payload>(encryptedB)).toEqual(payload);
  });

  it("throws when decrypting with a different key", () => {
    const payload = { fid: 123, signerUuid: "uuid" };
    const encrypted = encryptJson(payload);

    process.env[KEY_ENV] = Buffer.alloc(32, 8).toString("base64");

    expect(() => decryptJson<typeof payload>(encrypted)).toThrow();
  });

  it("throws when encrypted payload is tampered", () => {
    const encrypted = encryptJson({ fid: 123, signerUuid: "uuid" });
    const raw = Buffer.from(encrypted, "base64");
    raw[raw.length - 1] = raw[raw.length - 1]! ^ 0xff;

    expect(() => decryptJson(raw.toString("base64"))).toThrow();
  });
});
