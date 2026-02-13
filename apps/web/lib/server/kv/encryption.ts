import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import type { JsonValue } from "@/lib/shared/json";

const KEY_ENV = "FARCASTER_SIGNER_ENCRYPTION_KEY";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function loadKey(): Buffer {
  const keyBase64 = process.env[KEY_ENV];
  if (!keyBase64) {
    throw new Error(`${KEY_ENV} is not set`);
  }

  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) {
    throw new Error(`${KEY_ENV} must be 32 bytes (base64-encoded)`);
  }

  return key;
}

export function encryptJson(value: JsonValue): string {
  const iv = randomBytes(IV_LENGTH);
  const key = loadKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptJson<T>(payload: string): T {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + TAG_LENGTH);
  const key = loadKey();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
