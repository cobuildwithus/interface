import "server-only";

import { headers } from "next/headers";

const DEFAULT_SITE_URL = "https://co.build";
const PRODUCTION_NODE_ENV = "production";

function normalizeOrigin(input: string): string | null {
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

function resolveOriginFromHeaders(headerList: Headers): string | null {
  const host = firstHeaderValue(headerList.get("x-forwarded-host") ?? headerList.get("host"));
  if (!host) return null;

  const forwardedProto = firstHeaderValue(headerList.get("x-forwarded-proto"));
  const protocol =
    forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : "https";
  return normalizeOrigin(`${protocol}://${host}`);
}

function resolveEnvSiteOrigin(): string | null {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!envUrl) return null;
  return normalizeOrigin(envUrl);
}

export function resolveBaseUrl(headerList: Headers): string {
  const envOrigin = resolveEnvSiteOrigin();
  if (envOrigin) return envOrigin;

  if (process.env.NODE_ENV === PRODUCTION_NODE_ENV) {
    return DEFAULT_SITE_URL;
  }

  return resolveOriginFromHeaders(headerList) ?? DEFAULT_SITE_URL;
}

export async function resolveRequestOrigin(): Promise<string> {
  const headerList = await headers();
  return resolveBaseUrl(headerList);
}
