import "server-only";

import { randomUUID } from "crypto";

export function buildIdemKey(): string {
  return randomUUID().replace(/-/g, "").slice(0, 16);
}

export function normalizeOptionalUrl(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return trimmed;
  } catch {
    return null;
  }
}

export function normalizeOptionalUrlArray(
  value: Array<string | null | undefined> | null | undefined
): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const urls: string[] = [];
  for (const entry of value) {
    const normalized = normalizeOptionalUrl(entry);
    if (!normalized) return null;
    urls.push(normalized);
  }
  return urls;
}
