"use server";

import { neynarResolveCastFromUrl } from "./neynar-client";
import { extractFullHashFromUrl } from "./parse-cast-url";

type ResolveCastResult = { ok: true; hash: string } | { ok: false; error: string };

export async function resolveCastHashFromUrl(url: string): Promise<ResolveCastResult> {
  const directHash = extractFullHashFromUrl(url);
  if (directHash) {
    return { ok: true, hash: directHash };
  }

  return neynarResolveCastFromUrl(url);
}
