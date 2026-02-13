import "server-only";

import { headers } from "next/headers";

const DEFAULT_SITE_URL = "https://co.build";

export function resolveBaseUrl(headerList: Headers): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return DEFAULT_SITE_URL;

  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}

export async function resolveRequestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return DEFAULT_SITE_URL;
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}
