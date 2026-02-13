import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { FarcasterCast } from "@/types/farcaster";
import type { CastAttachment } from "./types";

const IMAGE_HOST_HINTS = [
  "imagedelivery.net",
  "i.imgur.com",
  "res.cloudinary.com",
  "images.neynar.com",
  "img.neynar.com",
  "img.seadn.io",
  "i.seadn.io",
  "media.discordapp.net",
  "cdn.discordapp.com",
  "pbs.twimg.com",
  "warpcast.com",
];
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"];

const EMPTY_ARRAY: string[] = [];

function isRecord(value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toUrl(value: Prisma.JsonValue | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

function getUrlHost(value: string): string | null {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (IMAGE_HOST_HINTS.some((host) => lower.includes(host))) return true;
  return IMAGE_EXTENSIONS.some((ext) => lower.includes(ext));
}

function readUrlCandidate(value: Prisma.JsonValue | null | undefined): string | null {
  const direct = toUrl(value);
  if (direct) return direct;

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = readUrlCandidate(entry);
      if (found) return found;
    }
  }

  if (isRecord(value)) {
    if ("url" in value) {
      const fromUrl = readUrlCandidate(value.url);
      if (fromUrl) return fromUrl;
    }
  }

  return null;
}

function extractUrlFromObject(value: Prisma.JsonValue | null | undefined): string | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const candidate = extractUrlFromObject(entry);
      if (candidate) return candidate;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  const primaryKeys = [
    "image",
    "imageUrl",
    "image_url",
    "thumbnail",
    "thumbnailUrl",
    "thumbnail_url",
    "ogImage",
    "og_image",
    "url",
  ];

  for (const key of primaryKeys) {
    if (key in value) {
      const candidate = readUrlCandidate(value[key]);
      if (candidate) return candidate;
    }
  }

  const nestedKeys = ["html", "metadata", "meta", "openGraph", "og", "images"];
  for (const key of nestedKeys) {
    if (key in value) {
      const candidate = extractUrlFromObject(value[key]) ?? readUrlCandidate(value[key]);
      if (candidate) return candidate;
    }
  }

  return null;
}

function extractUrlFromSummary(summary: string): string | null {
  const trimmed = summary.trim();
  if (!trimmed) return null;

  const direct = toUrl(trimmed);
  if (direct) return direct;

  try {
    const parsed = JSON.parse(trimmed) as Prisma.JsonValue;
    return extractUrlFromObject(parsed);
  } catch {
    return null;
  }
}

function normalizeSummaries(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) return EMPTY_ARRAY;
  const result = value.filter((entry) => typeof entry === "string").map((entry) => entry.trim());
  return result.filter(Boolean);
}

function getEmbedUrls(
  embeds: FarcasterCast["embeds"] | undefined,
  embedSummaries: string[] | null | undefined
): string[] {
  const urls: string[] = [];

  if (Array.isArray(embeds)) {
    for (const embed of embeds) {
      if (embed?.url) {
        urls.push(embed.url);
      }
    }
  }

  const summaries = normalizeSummaries(embedSummaries);
  for (const summary of summaries) {
    const found = extractUrlFromSummary(summary);
    if (found) urls.push(found);
  }

  return urls;
}

export function getPrimaryAttachment(
  embeds: FarcasterCast["embeds"] | undefined,
  embedSummaries: string[] | null | undefined
): CastAttachment | null {
  const urls = getEmbedUrls(embeds, embedSummaries);
  if (urls.length === 0) return null;

  const imageUrl = urls.find((url) => isImageUrl(url));
  if (imageUrl) {
    return {
      kind: "image",
      url: imageUrl,
      label: null,
      sourceUrl: imageUrl,
    };
  }

  const linkUrl = urls[0];
  if (!linkUrl) return null;

  return {
    kind: "link",
    url: linkUrl,
    label: getUrlHost(linkUrl),
    sourceUrl: linkUrl,
  };
}

export function getTitleAndExcerpt(text: string): { title: string; excerpt: string } {
  const lines = text.split(/\r?\n/);
  const firstLine = lines[0] ?? "";
  const title = firstLine.trim() || "Untitled cast";
  const rest = lines.slice(1).join(" ").trim();
  return { title, excerpt: rest };
}
