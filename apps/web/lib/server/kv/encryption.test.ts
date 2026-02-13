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
});
