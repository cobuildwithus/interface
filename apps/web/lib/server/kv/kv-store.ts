import { kv } from "@vercel/kv";
import type { JsonValue } from "@/lib/shared/json";
import { decryptJson, encryptJson } from "./encryption";

export async function saveEncryptedItem<T extends JsonValue>(key: string, value: T): Promise<void> {
  const encrypted = encryptJson(value);
  await kv.set(key, encrypted);
}

export async function getDecryptedItem<T>(key: string): Promise<T | null> {
  const item = await kv.get<string>(key);
  if (!item) return null;
  return decryptJson<T>(item);
}

export async function deleteItem(key: string): Promise<void> {
  await kv.del(key);
}
