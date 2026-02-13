import { getFarcasterChannelUrl } from "@/lib/integrations/farcaster/urls";

export const COBUILD_CHANNEL_URL = getFarcasterChannelUrl("cobuild");

export const DISCUSSION_CACHE_TAG = "farcaster:discussion:cobuild";
export const THREAD_CACHE_TAG = "farcaster:thread:cobuild";
export const NEYNAR_SCORE_THRESHOLD = 0.55;
export const DISCUSSION_PAGE_SIZE = 24;
export const THREAD_PAGE_SIZE = 20;

export function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function toNumber(value: number | string | bigint | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function toFidNumber(value: bigint | number | null | undefined): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
}

export function bufferToHash(buffer: Buffer | null): string | null {
  if (!buffer) return null;
  return `0x${Buffer.from(buffer).toString("hex")}`;
}
