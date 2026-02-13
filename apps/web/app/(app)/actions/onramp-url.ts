"use server";

import { getSession } from "@/lib/domains/auth/session";
import { getCoinbaseOnrampUrl } from "@/lib/server/onramp-url";
import { resolveRequestOrigin } from "@/lib/server/resolve-base-url";

export async function createOnrampUrlAction(body: {
  address?: string;
  presetFiatAmount?: number;
  presetCryptoAmount?: number;
  fiatCurrency?: string;
  redirectUrl?: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await getSession();
  const origin = await resolveRequestOrigin();
  const result = await getCoinbaseOnrampUrl(session.address ?? null, body, origin);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, url: result.data.url };
}
